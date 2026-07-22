# Unit Test Cases — F-006: Client Management

Feature ID   : F-006
Layer        : Backend (NestJS / Jest) + Frontend (Vitest / RTL)
Framework    : Jest (BE), Vitest + React Testing Library (FE)

---

## Backend Unit Tests

### UTC-F-006-B-001
Title        : CreateClient_UniqueName_ReturnsCreatedClient
AC Covered   : AC-1
Arrange      : findFirst returns null (no duplicate); create returns mock client
Act          : service.create({ name: 'Acme Corp', contactPerson: 'John', email: 'john@acme.com' })
Assert       : result.name === 'Acme Corp'; create called once

---

### UTC-F-006-B-002
Title        : CreateClient_DuplicateName_ThrowsConflictException
AC Covered   : AC-2
Arrange      : findFirst returns existing client
Act          : service.create({ name: 'Acme Corp', ... })
Assert       : throws ConflictException; create not called

---

### UTC-F-006-B-003
Title        : UpdateClient_ValidData_ReturnsUpdatedClient
AC Covered   : AC-3
Arrange      : findUnique returns existing; findFirst (duplicate check) returns null; update returns updated
Act          : service.update('client-001', { name: 'New Name' })
Assert       : result.name === 'New Name'

---

### UTC-F-006-B-004
Title        : UpdateClient_NotFound_ThrowsNotFoundException
AC Covered   : AC-3
Arrange      : findUnique returns null
Act          : service.update('bad-id', { name: 'X' })
Assert       : throws NotFoundException

---

### UTC-F-006-B-005
Title        : UpdateClient_DuplicateName_ThrowsConflictException
AC Covered   : AC-4
Arrange      : findUnique returns existing client; findFirst returns a DIFFERENT client with same name
Act          : service.update('client-001', { name: 'Taken Name' })
Assert       : throws ConflictException

---

### UTC-F-006-B-006
Title        : SetStatus_ValidId_TogglesIsActive
AC Covered   : AC-5, AC-6
Arrange      : findUnique returns active client; update returns { isActive: false }
Act          : service.setStatus('client-001', false)
Assert       : result.isActive === false; update called with { data: { isActive: false } }

---

### UTC-F-006-B-007
Title        : FindAll_IncludeInactive_ReturnsAllClients
AC Covered   : AC-7
Arrange      : findMany returns [active, inactive]
Act          : service.findAll(true)
Assert       : result.length === 2; findMany called with where: undefined

---

## Frontend Unit Tests

### UTC-F-006-FE-001
Title        : ClientsPage_LoadsClients_DisplaysNameAndStatus
AC Covered   : AC-7
Arrange      : mock list() returns [{ name: 'Acme', isActive: true }, { name: 'Beta', isActive: false }]
Act          : render <ClientsPage />
Assert       : 'Acme' and 'Beta' visible; one 'Active' badge and one 'Inactive' badge

---

### UTC-F-006-FE-002
Title        : ClientsPage_EmptyList_ShowsEmptyState
AC Covered   : AC-9
Arrange      : mock list() returns []
Act          : render <ClientsPage />
Assert       : 'No clients yet' text visible

---

### UTC-F-006-FE-003
Title        : ClientsPage_AddButtonClick_OpensModal
AC Covered   : AC-1
Arrange      : mock list() returns []
Act          : click 'Add Client' button
Assert       : modal with heading 'Add Client' is visible

---

### UTC-F-006-FE-004
Title        : ClientsPage_SubmitEmptyName_DoesNotCallApi
AC Covered   : AC-1 (validation)
Act          : open modal, click Save without entering name
Assert       : create not called

---

### UTC-F-006-FE-005
Title        : ClientsPage_EditButton_OpensModalWithPrefilledData
AC Covered   : AC-3
Arrange      : mock list() returns one client
Act          : click Edit on first row
Assert       : modal shows 'Edit Client'; name input pre-filled
