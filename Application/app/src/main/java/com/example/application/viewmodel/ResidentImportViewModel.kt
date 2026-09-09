package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.ResidentImportPreviewDto
import com.example.application.data.remote.dto.ResidentImportResultDto
import com.example.application.data.remote.dto.ResidentImportBatchDto
import com.example.application.data.repository.AdminManagementRepository
import com.example.application.util.NetworkResult
import com.example.application.util.ResidentImportFileManager
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import okhttp3.ResponseBody

data class ResidentImportState(val selected:ResidentImportFileManager.SelectedFile?=null,val preview:ResidentImportPreviewDto?=null,val result:ResidentImportResultDto?=null,val history:List<ResidentImportBatchDto> = emptyList(),val busy:Boolean=false,val templateDownloading:Boolean=false,val error:String?=null,val confirm:Boolean=false)
sealed interface ResidentImportEvent { data class Download(val body:ResponseBody,val name:String):ResidentImportEvent }

@HiltViewModel
class ResidentImportViewModel @Inject constructor(private val repository:AdminManagementRepository):ViewModel(){
    private val _state=MutableStateFlow(ResidentImportState());val state:StateFlow<ResidentImportState> = _state.asStateFlow()
    private val _event=MutableStateFlow<ResidentImportEvent?>(null);val event:StateFlow<ResidentImportEvent?> = _event.asStateFlow()
    fun select(file:ResidentImportFileManager.SelectedFile?)=_state.update{it.copy(selected=file,preview=null,result=null,error=null)}
    fun clearEvent(){_event.value=null}
    fun clearError()=_state.update{it.copy(error=null)}
    fun showConfirm(value:Boolean)=_state.update{it.copy(confirm=value)}
    fun template()=download("resident_import_sample.xlsx",true){repository.downloadResidentTemplate()}
    fun errors(){val id=_state.value.preview?.batchId?:return;download("Resident_Import_Errors_$id.xlsx"){repository.downloadResidentImportErrors(id)}}
    fun downloadErrors(id:String)=download("Resident_Import_Errors_$id.xlsx"){repository.downloadResidentImportErrors(id)}
    fun history()=viewModelScope.launch{_state.update{it.copy(busy=true,error=null)};when(val r=repository.residentImportHistory()){is NetworkResult.Success->_state.update{it.copy(busy=false,history=r.data)};is NetworkResult.Error->_state.update{it.copy(busy=false,error=repository.userMessageFor(r.error))};NetworkResult.Loading->Unit}}
    fun preview(file:okhttp3.MultipartBody.Part)=viewModelScope.launch{_state.update{it.copy(busy=true,error=null)};when(val r=repository.previewResidentImport(file)){is NetworkResult.Success->_state.update{it.copy(busy=false,preview=r.data)};is NetworkResult.Error->_state.update{it.copy(busy=false,error=repository.userMessageFor(r.error))};NetworkResult.Loading->Unit}}
    fun confirm()=viewModelScope.launch{val id=_state.value.preview?.batchId?:return@launch;_state.update{it.copy(busy=true,error=null,confirm=false)};when(val r=repository.confirmResidentImport(id)){is NetworkResult.Success->_state.update{it.copy(busy=false,result=r.data)};is NetworkResult.Error->_state.update{it.copy(busy=false,error=repository.userMessageFor(r.error))};NetworkResult.Loading->Unit}}
    private fun download(name:String,template:Boolean=false,call:suspend()->NetworkResult<ResponseBody>)=viewModelScope.launch{_state.update{it.copy(busy=true,templateDownloading=template,error=null)};when(val r=call()){is NetworkResult.Success->{_state.update{it.copy(busy=false,templateDownloading=false)};_event.value=ResidentImportEvent.Download(r.data,name)};is NetworkResult.Error->_state.update{it.copy(busy=false,templateDownloading=false,error=repository.userMessageFor(r.error))};NetworkResult.Loading->Unit}}
}
