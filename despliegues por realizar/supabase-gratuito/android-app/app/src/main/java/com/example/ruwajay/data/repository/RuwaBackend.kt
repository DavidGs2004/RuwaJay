package com.example.ruwajay.data.repository

import android.content.ContentResolver
import android.net.Uri
import com.example.ruwajay.BuildConfig
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.TaskCompletionSource
import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import org.json.JSONObject
import org.json.JSONArray
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.UUID
import java.util.concurrent.Executors

object RuwaBackend {
    private val executor = Executors.newFixedThreadPool(3)
    private val baseUrl: String get() = (BuildConfig.RUWA_BACKEND_URL.ifBlank {
        BuildConfig.SUPABASE_URL.trimEnd('/').takeIf { it.isNotBlank() }?.plus("/functions/v1/ruwajay-api") ?: ""
    }).trimEnd('/')

    private fun session(uid: String) = FirebaseAuth.getInstance().currentUser?.takeIf { it.uid == uid }
        ?: throw Exception("La sesión cambió. Inténtalo con la cuenta actual.")

    private fun <T> authorized(expectedUid: String?, operation: (String, String) -> T): Task<T> {
        val result = TaskCompletionSource<T>()
        val account = FirebaseAuth.getInstance().currentUser
        if (account == null || expectedUid != null && account.uid != expectedUid) {
            result.setException(Exception("Debes iniciar sesión con la cuenta actual.")); return result.task
        }
        val uid = account.uid
        account.getIdToken(false).addOnSuccessListener { token ->
            executor.execute {
                try {
                    session(uid)
                    val value = operation(token.token ?: throw Exception("Sesión inválida."), uid)
                    session(uid)
                    result.setResult(value)
                } catch (error: Exception) { result.setException(error) }
            }
        }.addOnFailureListener { result.setException(it) }
        return result.task
    }

    private fun post(route: String, token: String, bytes: ByteArray, mime: String): JSONObject {
        val endpoint = baseUrl
        if (endpoint.isBlank()) throw Exception("Este servicio todavía no está disponible. Contacta al administrador.")
        if (!endpoint.startsWith("https://")) throw Exception("Configuración de servicio inválida.")
        val connection = URL(endpoint + route).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"; connection.doOutput = true
            connection.connectTimeout = 15000; connection.readTimeout = 60000
            connection.setFixedLengthStreamingMode(bytes.size)
            connection.setRequestProperty("Authorization", "Bearer " + token)
            connection.setRequestProperty("Content-Type", mime)
            connection.outputStream.use { it.write(bytes) }
            val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.bufferedReader()?.use { it.readText() } ?: "{}"
            val response = JSONObject(body)
            if (connection.responseCode !in 200..299 || response.has("error")) {
                throw Exception(response.optJSONObject("error")?.optString("message") ?: "No se pudo completar la operación.")
            }
            return response.getJSONObject("data")
        } finally { connection.disconnect() }
    }

    fun invoke(action: String, data: Map<String, Any?>, expectedUid: String? = null): Task<Map<String, Any?>> {
        val requestId = UUID.randomUUID().toString()
        val bytes = JSONObject(mapOf("action" to action, "data" to (data + ("requestId" to requestId)))).toString().toByteArray(Charsets.UTF_8)
        return authorized(expectedUid) { token, _ -> toMap(post("", token, bytes, "application/json")) }
    }

    fun upload(kind: String, uri: Uri, resolver: ContentResolver, roomId: String? = null, propertyId: String? = null,
        mime: String? = null, expectedUid: String? = null): Task<String> = authorized(expectedUid) { token, _ ->
        val contentType = (mime ?: resolver.getType(uri) ?: "image/jpeg").substringBefore(';')
        val maximum = (if (kind == "chat") 20 else 8) * 1024 * 1024
        val bytes = resolver.openInputStream(uri)?.use { input ->
            val output = ByteArrayOutputStream(); val buffer = ByteArray(8192); var size = 0
            while (true) { val read = input.read(buffer); if (read < 0) break; size += read
                if (size > maximum) throw Exception("El archivo supera el tamaño permitido.")
                output.write(buffer, 0, read)
            }
            output.toByteArray()
        } ?: throw Exception("No se pudo abrir el archivo.")
        if (bytes.isEmpty()) throw Exception("El archivo está vacío.")
        val query = mutableListOf("kind=" + URLEncoder.encode(kind,"UTF-8"))
        roomId?.let { query += "roomId=" + URLEncoder.encode(it,"UTF-8") }
        propertyId?.let { query += "propertyId=" + URLEncoder.encode(it,"UTF-8") }
        post("/upload?" + query.joinToString("&"), token, bytes, contentType).getString("url")
    }

    fun resolve(reference: String, expectedUid: String? = null): Task<String> {
        if (!reference.startsWith("supabase://")) return Tasks.forResult(reference)
        return invoke("resolveMedia", mapOf("reference" to reference), expectedUid).continueWith { task ->
            if (!task.isSuccessful) throw task.exception ?: Exception("Archivo privado no disponible.")
            task.result["url"] as? String ?: throw Exception("Respuesta de archivo inválida.")
        }
    }

    private fun toMap(value: JSONObject): Map<String, Any?> = value.keys().asSequence().associateWith { key -> decode(value.get(key)) }
    private fun decode(value: Any?): Any? = when (value) {
        JSONObject.NULL -> null
        is JSONObject -> toMap(value)
        is JSONArray -> (0 until value.length()).map { decode(value.get(it)) }
        else -> value
    }
}
