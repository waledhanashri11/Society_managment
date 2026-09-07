package com.example.application.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.OverallReportDto
import com.example.application.data.remote.dto.currentFinancialYear
import com.example.application.data.repository.ReportRepository
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class OverallReportFilter(val financialYear:String=currentFinancialYear(),val month:Int?=null,val fromDate:String="",val toDate:String="",val transactionType:String="",val paymentMode:String="",val residentId:String="",val flat:String="",val status:String="",val search:String="",val page:Int=1)
data class OverallReportUiState(val loading:Boolean=true,val refreshing:Boolean=false,val data:OverallReportDto?=null,val filter:OverallReportFilter=OverallReportFilter(),val error:String?=null)

@HiltViewModel class OverallReportViewModel @Inject constructor(private val repository:ReportRepository):ViewModel(){
    private val _state=MutableStateFlow(OverallReportUiState()); val state:StateFlow<OverallReportUiState> = _state.asStateFlow()
    private var job:Job?=null
    init{ load() }
    fun setMonth(month:Int?){ update(_state.value.filter.copy(month=month,fromDate="",toDate="",page=1),false) }
    fun setFinancialYear(value:String){ update(_state.value.filter.copy(financialYear=value,month=null,fromDate="",toDate="",page=1),false) }
    fun applyDateRange(from:String,to:String){
        update(
            _state.value.filter.copy(
                fromDate=from,
                toDate=to,
                transactionType="",
                paymentMode="",
                status="",
                residentId="",
                flat="",
                page=1
            ),
            false
        )
    }
    fun search(value:String){ _state.update{it.copy(filter=it.filter.copy(search=value,page=1))}; job?.cancel(); job=viewModelScope.launch{delay(450);load(true)} }
    fun page(value:Int){update(_state.value.filter.copy(page=value),false)}
    fun refresh()=load(true)
    private fun update(filter:OverallReportFilter,refresh:Boolean){_state.update{it.copy(filter=filter)};load(refresh)}
    private fun load(refresh:Boolean=false){job?.cancel();job=viewModelScope.launch{val f=_state.value.filter;_state.update{it.copy(loading=it.data==null,refreshing=refresh&&it.data!=null,error=null)};when(val r=repository.getOverallReport(f.financialYear,f.month,f.fromDate.ifBlank{null},f.toDate.ifBlank{null},f.transactionType.ifBlank{null},f.paymentMode.ifBlank{null},f.residentId.ifBlank{null},f.flat.ifBlank{null},f.status.ifBlank{null},f.search.ifBlank{null},f.page)){is NetworkResult.Success->_state.update{it.copy(loading=false,refreshing=false,data=r.data)};is NetworkResult.Error->_state.update{it.copy(loading=false,refreshing=false,error=repository.messageFor(r.error))};NetworkResult.Loading->Unit}}}
}
