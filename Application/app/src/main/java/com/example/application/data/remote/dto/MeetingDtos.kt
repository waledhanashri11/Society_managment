package com.example.application.data.remote.dto

import com.google.gson.annotations.SerializedName

data class MeetingDto(
    val id: String?, val title: String?, @SerializedName("meeting_type") val meetingType: String?,
    @SerializedName("meeting_date") val meetingDate: String?, @SerializedName("start_time") val startTime: String?,
    @SerializedName("end_time") val endTime: String?, val venue: String?, val description: String?,
    val priority: String?, val status: String?, @SerializedName("notify_residents") val notifyResidents: Boolean?,
    @SerializedName("present_count") val presentCount: Int?, @SerializedName("total_count") val totalCount: Int?,
    @SerializedName("has_report") val hasReport: Boolean?, @SerializedName("has_voting") val hasVoting: Boolean?
)

data class MeetingDetailsDto(
    val id: String?, val title: String?, @SerializedName("meeting_type") val meetingType: String?,
    @SerializedName("meeting_date") val meetingDate: String?, @SerializedName("start_time") val startTime: String?,
    @SerializedName("end_time") val endTime: String?, val venue: String?, val description: String?,
    val priority: String?, val status: String?, val agendas: List<MeetingAgendaDto>?, val report: MeetingReportDto?,
    val actions: List<MeetingActionDto>?, val documents: List<MeetingDocumentDto>?, val vote: MeetingVoteDto?,
    @SerializedName("my_attendance") val myAttendance: String?
)

data class MeetingAgendaDto(@SerializedName("item_text") val itemText: String?, @SerializedName("order_index") val orderIndex: Int?, val id: String? = null)
data class MeetingDocumentDto(val id: String?, @SerializedName("file_name") val fileName: String?, @SerializedName("file_url") val fileUrl: String?, @SerializedName("file_path") val filePath: String?, @SerializedName("file_type") val fileType: String?)
data class MeetingReportDto(val id: String?, val summary: String?, val discussion: String?, @SerializedName("decisions_taken") val decisionsTaken: String?, val remarks: String?)
data class MeetingActionDto(
    val id: String?,
    @SerializedName("meeting_id") val meetingId: String?,
    @SerializedName("action_text") val actionText: String?,
    @SerializedName("assigned_to") val assignedTo: String?,
    @SerializedName("assignee_name") val assigneeName: String?,
    @SerializedName("due_date") val dueDate: String?,
    val priority: String?,
    val status: String?,
    val notes: String?,
    @SerializedName("completion_details") val completionDetails: String?,
    @SerializedName("completed_at") val completedAt: String?
)
data class MeetingVoteDto(val id: String?, val question: String?, @SerializedName("yes_count") val yesCount: Int?, @SerializedName("no_count") val noCount: Int?, @SerializedName("abstain_count") val abstainCount: Int?, @SerializedName("has_voted") val hasVoted: Boolean?, @SerializedName("my_choice") val myChoice: String?)
data class MeetingAttendanceDto(@SerializedName("resident_id") val residentId: String?, @SerializedName("resident_name") val residentName: String?, @SerializedName("flat_no") val flatNo: String?, val wing: String?, val status: String?)

data class MeetingSaveRequest(val title: String, @SerializedName("meeting_type") val meetingType: String, @SerializedName("meeting_date") val meetingDate: String, @SerializedName("start_time") val startTime: String, @SerializedName("end_time") val endTime: String, val venue: String, val description: String? = null, val priority: String = "Normal", @SerializedName("notify_residents") val notifyResidents: Boolean = false, val documents: List<MeetingDocumentUploadDto> = emptyList())
data class MeetingDocumentUploadDto(val name: String, val data: String)
data class MeetingAgendaSaveRequest(val items: List<MeetingAgendaSaveItem>)
data class MeetingAgendaSaveItem(@SerializedName("item_text") val itemText: String, @SerializedName("order_index") val orderIndex: Int)
data class MeetingAttendanceSaveRequest(val attendance: List<MeetingAttendanceSaveItem> = emptyList(), val status: String? = null)
data class MeetingAttendanceSaveItem(@SerializedName("resident_id") val residentId: String, val status: String)
data class MeetingReportSaveRequest(val summary: String?, val discussion: String?, @SerializedName("decisions_taken") val decisionsTaken: String?, val remarks: String?, val documents: List<MeetingDocumentUploadDto> = emptyList())
data class MeetingActionSaveRequest(@SerializedName("meeting_id") val meetingId: String, @SerializedName("action_text") val actionText: String, @SerializedName("assigned_to") val assignedTo: String? = null, @SerializedName("due_date") val dueDate: String? = null, val priority: String = "Normal", val status: String = "Pending", val notes: String? = null, @SerializedName("completion_details") val completionDetails: String? = null)
data class MeetingActionStatusRequest(val status: String, @SerializedName("completion_details") val completionDetails: String? = null)
data class MeetingVoteSaveRequest(@SerializedName("meeting_id") val meetingId: String, val question: String)
data class MeetingVoteCastRequest(val choice: String)
