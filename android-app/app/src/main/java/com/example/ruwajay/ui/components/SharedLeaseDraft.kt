package com.example.ruwajay.ui.components

import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.example.ruwajay.data.model.Property
import com.example.ruwajay.data.repository.VisitRepository
import com.example.ruwajay.data.repository.VisitRequest
import com.example.ruwajay.data.repository.ChatRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FieldValue

@Composable
fun SharedLeaseDraft(property: Property) {
    val uid=FirebaseAuth.getInstance().currentUser?.uid ?: return
    val context=LocalContext.current
    val db=remember{FirebaseFirestore.getInstance()}
    var visits by remember(property.id) {mutableStateOf<List<VisitRequest>>(emptyList())}
    var selected by remember{mutableStateOf("")}
    var roomId by remember{mutableStateOf<String?>(null)}
    var terms by remember{mutableStateOf<Map<String,Any>>(emptyMap())}
    var rent by remember{mutableStateOf(property.price.toString())}
    var deposit by remember{mutableStateOf((property.deposit?:property.price).toString())}
    var months by remember{mutableStateOf("12")}
    var error by remember{mutableStateOf<String?>(null)}
    DisposableEffect(property.id,uid) {
        val registration=VisitRepository().observeUserVisits(onError={error=it.message}) { values->
            visits=values.filter{it.propertyId==property.id&&it.status in listOf("confirmada","aceptada")}
        }
        onDispose{registration?.remove()}
    }
    val visit=visits.find{it.id==selected}?:visits.firstOrNull()
    LaunchedEffect(visit?.id) {
        roomId=null
        if(visit!=null) {
            if(visit.conversationId.isNotBlank())roomId=visit.conversationId
            else ChatRepository().getOrCreateConversation(property.id,property.ownerId,property.title,seekerId=visit.tenantId){result->result.onSuccess{roomId=it}.onFailure{error=it.message}}
        }
    }
    DisposableEffect(roomId) {
        val listener=roomId?.let {id->db.collection("lease_drafts").document(id).addSnapshotListener{snapshot,failure->
            if(failure!=null)error=failure.message
            else {
                @Suppress("UNCHECKED_CAST")
                val stored=snapshot?.get("terms") as? Map<String,Any>
                terms=stored.orEmpty()
                if(stored!=null){rent=stored["monthlyRent"].toString();deposit=stored["depositAmount"].toString();months=stored["durationMonths"].toString()}
            }
        }}
        onDispose{listener?.remove()}
    }
    Column(Modifier.fillMaxWidth().padding(vertical=12.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
        Text("Borrador de arrendamiento sin firma",style=MaterialTheme.typography.titleMedium)
        error?.let{Text(it,color=MaterialTheme.colorScheme.error)}
        if(visit==null){Text("Para compartir un borrador necesitas una visita confirmada.");return@Column}
        if(uid==property.ownerId) {
            visits.forEach{v->TextButton(onClick={selected=v.id}){Text("Interesado: ${v.tenantName}")}}
            OutlinedTextField(value=rent,onValueChange={rent=it},label={Text("Renta mensual")})
            OutlinedTextField(value=deposit,onValueChange={deposit=it},label={Text("Deposito")})
            OutlinedTextField(value=months,onValueChange={months=it},label={Text("Duracion en meses")})
            Button(enabled=roomId!=null,onClick={
                val amount=rent.toDoubleOrNull();val guarantee=deposit.toDoubleOrNull();val duration=months.toDoubleOrNull()
                if(amount==null||guarantee==null||duration==null){error="Ingresa importes y duracion validos.";return@Button}
                val data=terms+mapOf("ownerName" to property.ownerName,"tenantName" to visit.tenantName,
                    "propertyAddress" to property.location.address,"monthlyRent" to amount,"depositAmount" to guarantee,
                    "maintenanceFee" to property.maintenanceFee,"durationMonths" to duration,
                    "startDate" to (terms["startDate"]?:java.text.SimpleDateFormat("yyyy-MM-dd",java.util.Locale.US).format(java.util.Date())))
                db.collection("lease_drafts").document(roomId!!).set(mapOf("participants" to listOf(visit.tenantId,visit.ownerId),
                    "conversationId" to roomId!!,"propertyId" to property.id,"ownerId" to property.ownerId,
                    "terms" to data,"updatedAt" to FieldValue.serverTimestamp()))
                    .addOnSuccessListener{error="Borrador compartido guardado."}.addOnFailureListener{error=it.message}
            }){Text("Guardar borrador compartido")}
        }
        if(terms.isNotEmpty()) {
            val summary="Borrador sin firma\nVivienda: ${property.title}\nPropietario: ${terms["ownerName"]}\nInteresado: ${terms["tenantName"]}\nRenta: ${terms["monthlyRent"]}\nDeposito: ${terms["depositAmount"]}\nDuracion: ${terms["durationMonths"]} meses\nInicio: ${terms["startDate"]}"
            Text(summary)
            TextButton(onClick={context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply{type="text/plain";putExtra(Intent.EXTRA_TEXT,summary)},"Compartir borrador"))}){Text("Compartir resumen")}
        }
    }
}
