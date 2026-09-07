package com.example.application.ui.screens.reports

import android.widget.Toast
import android.app.DatePickerDialog
import android.content.Context
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.Alignment
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.application.data.remote.dto.*
import com.example.application.ui.components.DashboardSkeleton
import com.example.application.ui.components.ErrorMessageCard
import com.example.application.util.DashboardFormatters
import com.example.application.util.ReportExportManager
import com.example.application.viewmodel.OverallReportViewModel
import java.time.LocalDate

private val months = listOf("January","February","March","April","May","June","July","August","September","October","November","December")
private fun money(value: Double) = DashboardFormatters.money(value.toBigDecimal())

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OverallReportScreen(onBack: () -> Unit, viewModel: OverallReportViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val month = state.filter.month
    Scaffold(containerColor = Color(0xFFF4F7FB), topBar = {
        TopAppBar(
            title = { Column { Text(month?.let { "${months[it - 1]} Report" } ?: "Overall Society Report", fontWeight = FontWeight.Bold); Text("FY ${state.filter.financialYear}", style = MaterialTheme.typography.labelMedium) } },
            navigationIcon = { IconButton(onClick = { if (month != null) viewModel.setMonth(null) else onBack() }) { Icon(Icons.Filled.ArrowBack, "Back") } },
            actions = { IconButton(onClick = viewModel::refresh) { Icon(Icons.Filled.Refresh, "Refresh") } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor=Color(0xFF123D91),titleContentColor=Color.White,navigationIconContentColor=Color.White,actionIconContentColor=Color.White)
        )
    }) { padding ->
        PullToRefreshBox(state.refreshing, viewModel::refresh, Modifier.fillMaxSize().padding(padding)) {
            if (state.loading && state.data == null) DashboardSkeleton()
            else ReportBody(state.data, state.error, state.filter.financialYear, month, state.filter.search, viewModel)
        }
    }
}

@Composable
private fun ReportBody(data: OverallReportDto?, error: String?, fy: String, month: Int?, search: String, vm: OverallReportViewModel) {
    val context = LocalContext.current
    var tab by remember(month) { mutableStateOf("Overview") }
    var filters by remember { mutableStateOf(false) }
    var from by remember { mutableStateOf("") }; var to by remember { mutableStateOf("") }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        error?.let { item { ErrorMessageCard(it) } }
        if (month == null) item {
            val current = fy.substringBefore('-').toIntOrNull() ?: 2026
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                (-3..0).forEach { offset ->
                    val start = current + offset
                    FilterChip(offset == 0, { vm.setFinancialYear("$start-${start + 1}") }, { Text("FY $start-${(start + 1).toString().takeLast(2)}") })
                }
            }
        }
        if (month != null) item { MonthReportHeading(fy, month) { vm.setMonth(null) } }
        item { ReportTools(search, month, filters, from, to, vm::search, { filters = !filters }, { vm.setMonth(null) }) }
        if (filters) item {
            DateFilterCard(
                from = from,
                to = to,
                onFrom = { from = it },
                onTo = { to = it },
                onClear = { from = ""; to = ""; vm.applyDateRange("", "") },
                onApply = { vm.applyDateRange(from, to); filters = false }
            )
        }
        data?.let { report ->
            item { Summary(report.summary, month?.let { "${months[it - 1]} Financial Summary" } ?: "Overall Financial Summary") }
            item { IncomeExpense(report.summary) }
            if (month == null && report.months != null) {
                item { Text("Month-wise Report", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold) }
                items(report.months, key = { "${it.year}-${it.month}" }) { row -> MonthRow(row) { vm.setMonth(row.month) } }
            }
            if (month != null) {
                item { Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) { listOf("Overview","Transactions","Collections","Expenses","Pending").forEach { name -> FilterChip(tab == name, { tab = name }, { Text(name) }) } } }
                when (tab) {
                    "Transactions" -> if (report.transactions.isEmpty()) item { EmptySection("No transactions found for ${months[month - 1]}.") } else items(report.transactions, key = { it.id }) { Transaction(it) }
                    "Collections" -> if (report.collections.isEmpty()) item { EmptySection("No collections received in ${months[month - 1]}.") } else items(report.collections, key = { it.id }) { Collection(it) }
                    "Expenses" -> if (report.expenses.isEmpty()) item { EmptySection("No expenses recorded in ${months[month - 1]}.") } else items(report.expenses, key = { it.id }) { Expense(it) }
                    "Pending" -> { item { SectionTotal("Outstanding dues", report.summary.pendingAmount, report.pending.size) }; if (report.pending.isEmpty()) item { EmptySection("No pending bills for ${months[month - 1]}.") } else items(report.pending, key = { it.id }) { Pending(it) } }
                    else -> {
                        item { MonthlyStatement(report.summary) }
                        item { SectionTotal("Collections received", report.summary.totalCollection, report.collections.size) }
                        if (report.collections.isEmpty()) item { EmptySection("No collections received in ${months[month - 1]}.") } else items(report.collections.take(3), key = { "overview-collection-${it.id}" }) { Collection(it) }
                        item { SectionTotal("Expenses paid", report.summary.totalExpenses, report.expenses.size) }
                        if (report.expenses.isEmpty()) item { EmptySection("No expenses recorded in ${months[month - 1]}.") } else items(report.expenses.take(3), key = { "overview-expense-${it.id}" }) { Expense(it) }
                        item { SectionTotal("Outstanding dues", report.summary.pendingAmount, report.pending.size) }
                        if (report.pending.isEmpty()) item { EmptySection("No pending bills for ${months[month - 1]}.") } else items(report.pending.take(3), key = { "overview-pending-${it.id}" }) { Pending(it) }
                        item { Text("Recent Transactions", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
                        if (report.transactions.isEmpty()) item { EmptySection("No transactions found for ${months[month - 1]}.") } else items(report.transactions.take(5), key = { "overview-transaction-${it.id}" }) { Transaction(it) }
                    }
                }
                if (tab == "Transactions" && report.pagination.totalPages > 1) item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { OutlinedButton({ vm.page(report.pagination.page - 1) }, enabled = report.pagination.page > 1) { Text("Previous") }; Text("${report.pagination.page} / ${report.pagination.totalPages}"); OutlinedButton({ vm.page(report.pagination.page + 1) }, enabled = report.pagination.page < report.pagination.totalPages) { Text("Next") } } }
            }
            item { ExportCard(report, context) }
        }
    }
}

@Composable
private fun ReportTools(search:String,month:Int?,filters:Boolean,from:String,to:String,onSearch:(String)->Unit,onFilter:()->Unit,onAllMonths:()->Unit){
    Card(shape=RoundedCornerShape(16.dp),colors=CardDefaults.cardColors(containerColor=Color.White),elevation=CardDefaults.cardElevation(1.dp)){
        Column(Modifier.padding(12.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
            OutlinedTextField(search,onSearch,Modifier.fillMaxWidth(),label={Text(if(month==null)"Search transactions" else "Search ${months[month-1]}")},leadingIcon={Icon(Icons.Filled.Search,null)},shape=RoundedCornerShape(12.dp),singleLine=true)
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){
                Button(onFilter,Modifier.weight(1f),shape=RoundedCornerShape(12.dp)){Icon(Icons.Filled.CalendarMonth,null);Spacer(Modifier.width(8.dp));Text(if(from.isNotBlank()||to.isNotBlank())"Date filter active" else if(filters)"Hide date filter" else "Filter by date")}
                if(month!=null) OutlinedButton(onAllMonths,Modifier.weight(1f)){Text("Full year")}
            }
            if(from.isNotBlank()||to.isNotBlank()) Text("Showing ${from.ifBlank{"the beginning"}} to ${to.ifBlank{"today"}}",style=MaterialTheme.typography.labelMedium,color=MaterialTheme.colorScheme.primary)
        }
    }
}

@Composable
private fun DateFilterCard(from:String,to:String,onFrom:(String)->Unit,onTo:(String)->Unit,onClear:()->Unit,onApply:()->Unit){
    val invalid=from.isNotBlank()&&to.isNotBlank()&&from>to
    Card(shape=RoundedCornerShape(16.dp),colors=CardDefaults.cardColors(containerColor=Color.White),elevation=CardDefaults.cardElevation(2.dp)){
        Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
            Text("Choose date range",style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Bold)
            Text("Only transactions within this period will be included.",style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant)
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){
                DateField(from,onFrom,"From date",Modifier.weight(1f))
                DateField(to,onTo,"To date",Modifier.weight(1f))
            }
            if(invalid) Text("From date must be before To date",color=MaterialTheme.colorScheme.error,style=MaterialTheme.typography.labelMedium)
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){
                OutlinedButton(onClear,Modifier.weight(1f),shape=RoundedCornerShape(10.dp)){Text("Clear")}
                Button(onApply,Modifier.weight(1f),enabled=!invalid,shape=RoundedCornerShape(10.dp)){Text("Apply dates")}
            }
        }
    }
}

@Composable
private fun DateField(value:String,onValue:(String)->Unit,label:String,modifier:Modifier){
    val context=LocalContext.current
    Box(modifier){
        OutlinedTextField(value=value,onValueChange={ _ -> },modifier=Modifier.fillMaxWidth(),label={Text(label)},placeholder={Text("YYYY-MM-DD")},trailingIcon={Icon(Icons.Filled.CalendarMonth,null)},shape=RoundedCornerShape(10.dp),readOnly=true,singleLine=true)
        Box(Modifier.matchParentSize().clickable{
            val initial=runCatching{LocalDate.parse(value)}.getOrDefault(LocalDate.now())
            DatePickerDialog(context,{_,year,month,day->onValue("%04d-%02d-%02d".format(year,month+1,day))},initial.year,initial.monthValue-1,initial.dayOfMonth).show()
        })
    }
}

@Composable
private fun ExportCard(report:OverallReportDto,context:Context){
    Card(shape=RoundedCornerShape(16.dp),colors=CardDefaults.cardColors(containerColor=Color.White),elevation=CardDefaults.cardElevation(1.dp)){
        Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
            Text("Download report",style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Bold)
            Text("Save a copy for committee records or sharing.",style=MaterialTheme.typography.bodySmall,color=MaterialTheme.colorScheme.onSurfaceVariant)
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(8.dp)){
                ReportExportManager.Format.entries.forEach{format->
                    OutlinedButton(
                        onClick={
                            runCatching{ReportExportManager.download(context,"Overall Society Report","${report.societyName.orEmpty()} • FY ${report.financialYear}",report,format)}
                                .onSuccess{Toast.makeText(context,"Saved ${it.fileName}",Toast.LENGTH_LONG).show()}
                                .onFailure{Toast.makeText(context,it.message?:"Export failed",Toast.LENGTH_LONG).show()}
                        },
                        modifier=Modifier.weight(1f),shape=RoundedCornerShape(10.dp)
                    ){Icon(Icons.Filled.ReceiptLong,null,Modifier.size(18.dp));Spacer(Modifier.width(6.dp));Text(format.name)}
                }
            }
        }
    }
}
@Composable private fun MonthReportHeading(fy:String,month:Int,onBack:()->Unit){
    val start=fy.substringBefore('-').toIntOrNull()?:2026
    val year=if(month<=3)start+1 else start
    Card(colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.secondaryContainer)){
        Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(4.dp)){
            Text("${months[month-1]} $year",style=MaterialTheme.typography.headlineSmall,fontWeight=FontWeight.Bold)
            Text("Complete monthly society financial statement",style=MaterialTheme.typography.bodyMedium)
            TextButton(onClick=onBack,contentPadding=PaddingValues(0.dp)){Text("View full FY $fy report")}
        }
    }
}
@Composable private fun Summary(s:OverallReportSummaryDto,title:String){
    Card(shape=RoundedCornerShape(16.dp),colors=CardDefaults.cardColors(containerColor=Color.White),elevation=CardDefaults.cardElevation(1.dp)){
        Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
            Text(title,style=MaterialTheme.typography.titleLarge,fontWeight=FontWeight.Bold,color=Color(0xFF102A56))
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp)){
                KpiCard("Total Collection",money(s.totalCollection),Color(0xFF185ADB),Color(0xFFE8F0FF),Icons.Filled.AccountBalanceWallet,Modifier.weight(1f))
                KpiCard("Total Expenses",money(s.totalExpenses),Color(0xFFD92D3A),Color(0xFFFFE9EC),Icons.Filled.ReceiptLong,Modifier.weight(1f))
            }
            Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp)){
                KpiCard("Closing Balance",money(s.netBalance),Color(0xFF16833B),Color(0xFFE5F6EA),Icons.Filled.TrendingUp,Modifier.weight(1f))
                KpiCard("Outstanding",money(s.pendingAmount),Color(0xFFD97706),Color(0xFFFFF1DA),Icons.Filled.WarningAmber,Modifier.weight(1f))
            }
            HorizontalDivider(color=Color(0xFFE8EDF5))
            Line("Bills Generated",money(s.maintenanceGenerated),"Transactions",s.totalTransactions.toString())
            Line("Penalty Collected",money(s.penaltyCollected),"Paid / Pending Homes","${s.paidResidents} / ${s.pendingResidents}")
        }
    }
}
@Composable private fun KpiCard(label:String,value:String,color:Color,tint:Color,icon:androidx.compose.ui.graphics.vector.ImageVector,modifier:Modifier){
    Column(modifier.background(tint,RoundedCornerShape(14.dp)).padding(12.dp),verticalArrangement=Arrangement.spacedBy(5.dp)){
        Icon(icon,null,tint=color,modifier=Modifier.size(22.dp));Text(label,style=MaterialTheme.typography.labelMedium,color=Color(0xFF536278));Text(value,style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Bold,color=color,maxLines=1)
    }
}
@Composable private fun Line(a:String,av:String,b:String,bv:String){Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(12.dp)){Column(Modifier.weight(1f)){Text(a,style=MaterialTheme.typography.labelMedium);Text(av,fontWeight=FontWeight.Bold)};Column(Modifier.weight(1f)){Text(b,style=MaterialTheme.typography.labelMedium);Text(bv,fontWeight=FontWeight.Bold)}}}
@Composable private fun IncomeExpense(s:OverallReportSummaryDto){
    val total=(s.totalIncome+s.totalExpenses).takeIf{it>0}?:1.0
    val incomeWeight=(s.totalIncome/total).toFloat().coerceAtLeast(.01f)
    val expenseWeight=(s.totalExpenses/total).toFloat().coerceAtLeast(.01f)
    Card(shape=RoundedCornerShape(16.dp),colors=CardDefaults.cardColors(containerColor=Color.White),elevation=CardDefaults.cardElevation(1.dp)){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
        Text("Income vs Expense",style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Bold,color=Color(0xFF102A56))
        Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Column{Text("Income",style=MaterialTheme.typography.labelMedium);Text(money(s.totalIncome),fontWeight=FontWeight.Bold,color=Color(0xFF185ADB))};Column(horizontalAlignment=Alignment.End){Text("Expenses",style=MaterialTheme.typography.labelMedium);Text(money(s.totalExpenses),fontWeight=FontWeight.Bold,color=Color(0xFFD92D3A))}}
        Row(Modifier.fillMaxWidth().height(9.dp).clip(RoundedCornerShape(8.dp)),horizontalArrangement=Arrangement.spacedBy(2.dp)){Box(Modifier.weight(incomeWeight).fillMaxHeight().background(Color(0xFF185ADB)));Box(Modifier.weight(expenseWeight).fillMaxHeight().background(Color(0xFFD92D3A)))}
        Text(if(s.netBalance>=0)"Surplus ${money(s.netBalance)}" else "Deficit ${money(-s.netBalance)}",color=if(s.netBalance>=0)Color(0xFF16833B)else Color(0xFFD92D3A),fontWeight=FontWeight.Bold)
    }}
}
@Composable private fun MonthlyStatement(s:OverallReportSummaryDto){
    Card{Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){
        Text("Monthly Financial Statement",style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Bold)
        Line("Opening / Other Income",money(s.totalIncome-s.totalCollection),"Collections",money(s.totalCollection))
        Line("Total Income",money(s.totalIncome),"Less: Expenses",money(s.totalExpenses))
        HorizontalDivider()
        Text(if(s.netBalance>=0)"Monthly Surplus: ${money(s.netBalance)}" else "Monthly Deficit: ${money(-s.netBalance)}",style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Bold,color=if(s.netBalance>=0)Color(0xFF07883F)else MaterialTheme.colorScheme.error)
        Text("Collection performance: ${if(s.maintenanceGenerated>0)"%.1f%%".format((s.maintenanceCollected/s.maintenanceGenerated)*100) else "0.0%"}",style=MaterialTheme.typography.bodyMedium)
    }}
}
@Composable private fun SectionTotal(title:String,amount:Double,count:Int){Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Column{Text(title,style=MaterialTheme.typography.titleMedium,fontWeight=FontWeight.Bold);Text("$count record${if(count==1)"" else "s"}",style=MaterialTheme.typography.bodySmall)};Text(money(amount),fontWeight=FontWeight.Bold,color=MaterialTheme.colorScheme.primary)}}
@Composable private fun EmptySection(message:String){Card(colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surfaceVariant)){Text(message,Modifier.padding(16.dp),style=MaterialTheme.typography.bodyMedium)}}
@Composable private fun MonthRow(x:OverallMonthDto,click:()->Unit){Card(Modifier.fillMaxWidth().clickable(onClick=click),shape=RoundedCornerShape(14.dp),colors=CardDefaults.cardColors(containerColor=Color.White),elevation=CardDefaults.cardElevation(1.dp)){Row(Modifier.padding(14.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(10.dp)){Column(Modifier.weight(1f)){Text("${months[x.month-1]} ${x.year}",fontWeight=FontWeight.Bold,color=Color(0xFF102A56));Text("Collection ${money(x.totalCollection)}",style=MaterialTheme.typography.bodySmall,color=Color(0xFF185ADB));Text("Expenses ${money(x.totalExpenses)}",style=MaterialTheme.typography.bodySmall,color=Color(0xFFD92D3A))};Column(horizontalAlignment=Alignment.End){Text("Net",style=MaterialTheme.typography.labelSmall);Text(money(x.netBalance),fontWeight=FontWeight.Bold,color=if(x.netBalance>=0)Color(0xFF16833B)else Color(0xFFD92D3A));Text("${x.totalTransactions} transactions",style=MaterialTheme.typography.labelSmall)};Icon(Icons.Filled.ChevronRight,null,tint=Color(0xFF7A879B))}}}
@Composable private fun Transaction(x:OverallTransactionDto){var open by remember(x.id){mutableStateOf(false)};Card(Modifier.fillMaxWidth().clickable{open=!open}){Column(Modifier.padding(14.dp)){Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Text(x.type.orEmpty(),fontWeight=FontWeight.Bold);Text(if(x.credit>0)"${money(x.credit)} Received" else "${money(x.debit)} Spent")};Text(listOfNotNull(x.residentOrParty,x.flat).joinToString(" • "));Text("${x.date.orEmpty()} • ${x.status.orEmpty()}");if(open){HorizontalDivider(Modifier.padding(vertical=8.dp));Text("ID: ${x.transactionId.orEmpty()}");Text("${x.category.orEmpty()} • ${x.paymentMode.orEmpty()}");Text(x.description.orEmpty());Text("Credit ${money(x.credit)} • Debit ${money(x.debit)} • Balance ${money(x.balance)}")}}}}
@Composable private fun Collection(x:OverallCollectionDto)=Detail("${x.resident.orEmpty()} • ${x.flat.orEmpty()}","${x.date.orEmpty()} • Bill ${x.billMonth.orEmpty()}","Paid ${money(x.amountPaid)} • Remaining ${money(x.remaining)}","Bill ${money(x.billAmount)} • Penalty ${money(x.penalty)} • Write-off ${money(x.writeOff)} • ${x.status.orEmpty()}")
@Composable private fun Expense(x:OverallExpenseDto)=Detail(x.category.orEmpty(),"${x.date.orEmpty()} • ${x.vendor.orEmpty()}","Spent ${money(x.amount)}","${x.description.orEmpty()} • ${x.paymentMode.orEmpty()} • ${x.status.orEmpty()}")
@Composable private fun Pending(x:OverallPendingDto)=Detail("${x.resident.orEmpty()} • ${x.flat.orEmpty()}","Bill ${x.month.orEmpty()}","Remaining ${money(x.remaining)}","Original ${money(x.originalBill)} • Penalty ${money(x.penalty)} • Write-off ${money(x.writeOff)} • Paid ${money(x.paid)}")
@Composable private fun Detail(a:String,b:String,c:String,d:String){Card(Modifier.fillMaxWidth()){Column(Modifier.padding(14.dp)){Text(a,fontWeight=FontWeight.Bold);Text(b);Text(c,fontWeight=FontWeight.Bold);Text(d,style=MaterialTheme.typography.bodySmall)}}}
