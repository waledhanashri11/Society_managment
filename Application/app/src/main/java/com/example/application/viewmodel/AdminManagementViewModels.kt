package com.example.application.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.application.data.remote.dto.FlatDto
import com.example.application.data.remote.dto.FlatSaveRequest
import com.example.application.data.remote.dto.StaffDto
import com.example.application.data.remote.dto.StaffSaveRequest
import com.example.application.data.remote.dto.UserSaveRequest
import com.example.application.data.remote.dto.UserSummaryDto
import com.example.application.data.repository.AdminManagementRepository
import com.example.application.util.NetworkResult
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AdminListState<T>(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val items: List<T> = emptyList(),
    val query: String = "",
    val filter: String = "all",
    val message: String? = null,
    val error: String? = null,
    val actionId: String? = null
)

data class AdminDetailState<T>(
    val isLoading: Boolean = false,
    val item: T? = null,
    val message: String? = null,
    val error: String? = null,
    val isDeleting: Boolean = false,
    val isSubmitting: Boolean = false
)

data class ResidentFormState(
    val isLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val id: String? = null,
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val password: String = "",
    val status: String = "approved",
    val flatId: String = "",
    val flats: List<FlatDto> = emptyList(),
    val error: String? = null,
    val message: String? = null,
    val done: Boolean = false
)

data class FlatFormState(
    val isLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val id: String? = null,
    val flatNo: String = "",
    val wing: String = "A",
    val floorNo: String = "",
    val ownerId: String = "",
    val maintenanceCharge: String = "",
    val residents: List<UserSummaryDto> = emptyList(),
    val error: String? = null,
    val message: String? = null,
    val done: Boolean = false
)

data class StaffFormState(
    val isLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val id: String? = null,
    val name: String = "",
    val role: String = "",
    val phone: String = "",
    val salary: String = "",
    val error: String? = null,
    val message: String? = null,
    val done: Boolean = false
)

@HiltViewModel
class ResidentsViewModel @Inject constructor(
    private val repository: AdminManagementRepository
) : ViewModel() {
    private val _state = MutableStateFlow(AdminListState<UserSummaryDto>())
    val state: StateFlow<AdminListState<UserSummaryDto>> = _state.asStateFlow()

    init { load() }

    fun load(refresh: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.items.isEmpty(), isRefreshing = refresh, error = null, message = null) }
            when (val result = repository.getResidents(refresh)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, isRefreshing = false, items = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, isRefreshing = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun setQuery(value: String) = _state.update { it.copy(query = value) }
    fun setFilter(value: String) = _state.update { it.copy(filter = value) }
    fun resetFilters() = _state.update { it.copy(query = "", filter = "all") }

    fun updateStatus(id: String, status: String) {
        viewModelScope.launch {
            _state.update { it.copy(actionId = id, error = null, message = null) }
            when (val result = repository.updateResidentStatus(id, status)) {
                is NetworkResult.Success -> {
                    _state.update { it.copy(actionId = null, message = result.data) }
                    load(refresh = true)
                }
                is NetworkResult.Error -> _state.update { it.copy(actionId = null, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun delete(id: String) {
        viewModelScope.launch {
            _state.update { it.copy(actionId = id, error = null, message = null) }
            when (val result = repository.deleteResident(id)) {
                is NetworkResult.Success -> {
                    _state.update { it.copy(actionId = null, message = result.data) }
                    load(refresh = true)
                }
                is NetworkResult.Error -> _state.update { it.copy(actionId = null, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

@HiltViewModel
class ResidentDetailsViewModel @Inject constructor(
    private val repository: AdminManagementRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    private val id: String = savedStateHandle["id"] ?: ""
    private val _state = MutableStateFlow(AdminDetailState<UserSummaryDto>())
    val state: StateFlow<AdminDetailState<UserSummaryDto>> = _state.asStateFlow()

    init { load() }

    fun load() {
        if (id.isBlank()) {
            _state.update { it.copy(error = "Resident id is missing.") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.item == null, error = null, message = null) }
            when (val result = repository.getResident(id)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, item = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun updateStatus(status: String) = submit { repository.updateResidentStatus(id, status) }
    fun delete() = submit(deleting = true) { repository.deleteResident(id) }

    private fun submit(deleting: Boolean = false, block: suspend () -> NetworkResult<String>) {
        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = !deleting, isDeleting = deleting, error = null, message = null) }
            when (val result = block()) {
                is NetworkResult.Success -> {
                    _state.update { it.copy(isSubmitting = false, isDeleting = false, message = result.data) }
                    if (!deleting) load()
                }
                is NetworkResult.Error -> _state.update { it.copy(isSubmitting = false, isDeleting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

@HiltViewModel
class ResidentFormViewModel @Inject constructor(
    private val repository: AdminManagementRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    private val id: String? = savedStateHandle.get<String>("id")?.takeIf { it != "new" }
    private val _state = MutableStateFlow(ResidentFormState(id = id))
    val state: StateFlow<ResidentFormState> = _state.asStateFlow()

    init { load() }

    private fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val flatsResult = repository.getFlats(refresh = true)
            var flats = emptyList<FlatDto>()
            if (flatsResult is NetworkResult.Success) flats = flatsResult.data
            if (id == null) {
                _state.update { it.copy(isLoading = false, flats = flats.filter { flat -> flat.ownerId.isNullOrBlank() }) }
                return@launch
            }
            when (val result = repository.getResident(id)) {
                is NetworkResult.Success -> {
                    val resident = result.data
                    _state.update {
                        it.copy(
                            isLoading = false,
                            name = resident.name.orEmpty(),
                            email = resident.email.orEmpty(),
                            phone = resident.phone.orEmpty(),
                            status = resident.status ?: "approved",
                            flatId = resident.flatId.orEmpty(),
                            flats = flats.filter { flat -> flat.ownerId.isNullOrBlank() || flat.id == resident.flatId }
                        )
                    }
                }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, error = repository.userMessageFor(result.error), flats = flats) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    fun updateName(value: String) = _state.update { it.copy(name = value) }
    fun updateEmail(value: String) = _state.update { it.copy(email = value) }
    fun updatePhone(value: String) = _state.update { it.copy(phone = value) }
    fun updatePassword(value: String) = _state.update { it.copy(password = value) }
    fun updateStatus(value: String) = _state.update { it.copy(status = value) }
    fun updateFlat(value: String) = _state.update { it.copy(flatId = value) }

    fun submit() {
        val current = _state.value
        val validation = validateResident(current)
        if (validation != null) {
            _state.update { it.copy(error = validation) }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true, error = null, message = null) }
            val request = UserSaveRequest(
                name = current.name.trim(),
                email = current.email.trim(),
                phone = current.phone.trim().ifBlank { null },
                password = current.password.takeIf { current.id == null || it.isNotBlank() },
                role = "resident",
                status = current.status,
                flatId = current.flatId
            )
            when (val result = repository.saveResident(current.id, request)) {
                is NetworkResult.Success -> _state.update { it.copy(isSubmitting = false, message = result.data, done = true) }
                is NetworkResult.Error -> _state.update { it.copy(isSubmitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }

    private fun validateResident(state: ResidentFormState): String? {
        if (state.name.isBlank()) return "Name is required."
        if (state.email.isBlank()) return "Email is required."
        if (state.id == null && state.password.length < 6) return "Temporary password must be at least 6 characters."
        if (state.flatId.isBlank()) return "Please assign a flat."
        return null
    }
}

@HiltViewModel
class FlatsViewModel @Inject constructor(
    private val repository: AdminManagementRepository
) : ViewModel() {
    private val _state = MutableStateFlow(AdminListState<FlatDto>())
    val state: StateFlow<AdminListState<FlatDto>> = _state.asStateFlow()
    init { load() }
    fun load(refresh: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.items.isEmpty(), isRefreshing = refresh, error = null, message = null) }
            when (val result = repository.getFlats(refresh)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, isRefreshing = false, items = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, isRefreshing = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
    fun setQuery(value: String) = _state.update { it.copy(query = value) }
    fun setFilter(value: String) = _state.update { it.copy(filter = value) }
    fun resetFilters() = _state.update { it.copy(query = "", filter = "all") }
    fun delete(id: String) {
        viewModelScope.launch {
            _state.update { it.copy(actionId = id, error = null, message = null) }
            when (val result = repository.deleteFlat(id)) {
                is NetworkResult.Success -> { _state.update { it.copy(actionId = null, message = result.data) }; load(refresh = true) }
                is NetworkResult.Error -> _state.update { it.copy(actionId = null, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

@HiltViewModel
class FlatDetailsViewModel @Inject constructor(
    private val repository: AdminManagementRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    private val id: String = savedStateHandle["id"] ?: ""
    private val _state = MutableStateFlow(AdminDetailState<FlatDto>())
    val state: StateFlow<AdminDetailState<FlatDto>> = _state.asStateFlow()
    init { load() }
    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.item == null, error = null, message = null) }
            when (val result = repository.getFlat(id)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, item = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
    fun delete() {
        viewModelScope.launch {
            _state.update { it.copy(isDeleting = true, error = null) }
            when (val result = repository.deleteFlat(id)) {
                is NetworkResult.Success -> _state.update { it.copy(isDeleting = false, message = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isDeleting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

@HiltViewModel
class FlatFormViewModel @Inject constructor(
    private val repository: AdminManagementRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    private val id: String? = savedStateHandle.get<String>("id")?.takeIf { it != "new" }
    private val _state = MutableStateFlow(FlatFormState(id = id))
    val state: StateFlow<FlatFormState> = _state.asStateFlow()
    init { load() }
    private fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val residents = (repository.getResidents(refresh = true) as? NetworkResult.Success)?.data.orEmpty()
            if (id == null) {
                _state.update { it.copy(isLoading = false, residents = residents.filter { user -> user.flatId.isNullOrBlank() }) }
                return@launch
            }
            when (val result = repository.getFlat(id)) {
                is NetworkResult.Success -> {
                    val flat = result.data
                    _state.update {
                        it.copy(
                            isLoading = false,
                            flatNo = flat.flatNo.orEmpty(),
                            wing = flat.wing ?: "A",
                            floorNo = flat.floorNo.orEmpty(),
                            ownerId = flat.ownerId.orEmpty(),
                            maintenanceCharge = flat.maintenanceCharge?.toString().orEmpty(),
                            residents = residents.filter { user -> user.flatId.isNullOrBlank() || user.id == flat.ownerId }
                        )
                    }
                }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, error = repository.userMessageFor(result.error), residents = residents) }
                NetworkResult.Loading -> Unit
            }
        }
    }
    fun updateFlatNo(value: String) = _state.update { it.copy(flatNo = value) }
    fun updateWing(value: String) = _state.update { it.copy(wing = value) }
    fun updateFloor(value: String) = _state.update { it.copy(floorNo = value) }
    fun updateOwner(value: String) = _state.update { it.copy(ownerId = value) }
    fun updateMaintenance(value: String) = _state.update { it.copy(maintenanceCharge = value) }
    fun submit() {
        val current = _state.value
        val validation = validateFlat(current)
        if (validation != null) { _state.update { it.copy(error = validation) }; return }
        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true, error = null) }
            val request = FlatSaveRequest(
                flatNo = current.flatNo.trim(),
                wing = current.wing.trim().ifBlank { "A" },
                floorNo = current.floorNo.trim(),
                ownerId = current.ownerId.ifBlank { null },
                maintenanceCharge = current.maintenanceCharge.trim().ifBlank { "0" }
            )
            when (val result = repository.saveFlat(current.id, request)) {
                is NetworkResult.Success -> _state.update { it.copy(isSubmitting = false, message = result.data, done = true) }
                is NetworkResult.Error -> _state.update { it.copy(isSubmitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
    private fun validateFlat(state: FlatFormState): String? {
        if (state.flatNo.isBlank()) return "Flat number is required."
        if (state.floorNo.isBlank()) return "Floor number is required."
        val amount = state.maintenanceCharge.toBigDecimalOrNull()
        if (amount == null || amount.signum() < 0) return "Maintenance charge must be a valid non-negative amount."
        return null
    }
}

@HiltViewModel
class StaffViewModel @Inject constructor(
    private val repository: AdminManagementRepository
) : ViewModel() {
    private val _state = MutableStateFlow(AdminListState<StaffDto>())
    val state: StateFlow<AdminListState<StaffDto>> = _state.asStateFlow()
    init { load() }
    fun load(refresh: Boolean = false) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.items.isEmpty(), isRefreshing = refresh, error = null, message = null) }
            when (val result = repository.getStaff(refresh)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, isRefreshing = false, items = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, isRefreshing = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
    fun setQuery(value: String) = _state.update { it.copy(query = value) }
    fun setFilter(value: String) = _state.update { it.copy(filter = value) }
    fun resetFilters() = _state.update { it.copy(query = "", filter = "all") }
    fun delete(id: String) {
        viewModelScope.launch {
            _state.update { it.copy(actionId = id, error = null, message = null) }
            when (val result = repository.deleteStaff(id)) {
                is NetworkResult.Success -> { _state.update { it.copy(actionId = null, message = result.data) }; load(refresh = true) }
                is NetworkResult.Error -> _state.update { it.copy(actionId = null, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

@HiltViewModel
class StaffDetailsViewModel @Inject constructor(
    private val repository: AdminManagementRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    private val id: String = savedStateHandle["id"] ?: ""
    private val _state = MutableStateFlow(AdminDetailState<StaffDto>())
    val state: StateFlow<AdminDetailState<StaffDto>> = _state.asStateFlow()
    init { load() }
    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = it.item == null, error = null, message = null) }
            when (val result = repository.getStaffMember(id)) {
                is NetworkResult.Success -> _state.update { it.copy(isLoading = false, item = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
    fun delete() {
        viewModelScope.launch {
            _state.update { it.copy(isDeleting = true, error = null) }
            when (val result = repository.deleteStaff(id)) {
                is NetworkResult.Success -> _state.update { it.copy(isDeleting = false, message = result.data) }
                is NetworkResult.Error -> _state.update { it.copy(isDeleting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
}

@HiltViewModel
class StaffFormViewModel @Inject constructor(
    private val repository: AdminManagementRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {
    private val id: String? = savedStateHandle.get<String>("id")?.takeIf { it != "new" }
    private val _state = MutableStateFlow(StaffFormState(id = id))
    val state: StateFlow<StaffFormState> = _state.asStateFlow()
    init { load() }
    private fun load() {
        if (id == null) return
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            when (val result = repository.getStaffMember(id)) {
                is NetworkResult.Success -> {
                    val staff = result.data
                    _state.update {
                        it.copy(
                            isLoading = false,
                            name = staff.name.orEmpty(),
                            role = staff.role.orEmpty(),
                            phone = staff.phone.orEmpty(),
                            salary = staff.salary.orEmpty()
                        )
                    }
                }
                is NetworkResult.Error -> _state.update { it.copy(isLoading = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
    fun updateName(value: String) = _state.update { it.copy(name = value) }
    fun updateRole(value: String) = _state.update { it.copy(role = value) }
    fun updatePhone(value: String) = _state.update { it.copy(phone = value) }
    fun updateSalary(value: String) = _state.update { it.copy(salary = value) }
    fun submit() {
        val current = _state.value
        val validation = validateStaff(current)
        if (validation != null) { _state.update { it.copy(error = validation) }; return }
        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true, error = null) }
            val request = StaffSaveRequest(
                name = current.name.trim(),
                role = current.role.trim(),
                phone = current.phone.trim().ifBlank { null },
                salary = current.salary.trim()
            )
            when (val result = repository.saveStaff(current.id, request)) {
                is NetworkResult.Success -> _state.update { it.copy(isSubmitting = false, message = result.data, done = true) }
                is NetworkResult.Error -> _state.update { it.copy(isSubmitting = false, error = repository.userMessageFor(result.error)) }
                NetworkResult.Loading -> Unit
            }
        }
    }
    private fun validateStaff(state: StaffFormState): String? {
        if (state.name.isBlank()) return "Name is required."
        if (state.role.isBlank()) return "Role is required."
        val salary = state.salary.toBigDecimalOrNull()
        if (salary == null || salary.signum() < 0) return "Salary must be a valid non-negative amount."
        return null
    }
}
