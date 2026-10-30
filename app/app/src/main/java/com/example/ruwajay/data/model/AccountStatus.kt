package com.example.ruwajay.data.model

fun resolveAccountStatus(profile: Map<String, Any?>?): String {
    val canonical = profile?.get("accountStatus") as? String
    if (canonical in listOf("active", "inactive", "suspended")) return canonical!!
    if (profile?.get("suspended") == true || profile?.get("status") == "suspended") return "suspended"
    if (profile?.get("status") == "inactive") return "inactive"
    return "active"
}
