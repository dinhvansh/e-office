erDiagram

  TENANT ||--o{ USER : has
  TENANT ||--o{ DEPARTMENT : has
  TENANT ||--o{ DOCUMENT_TYPE : has
  TENANT ||--o{ DOCUMENT : owns
  TENANT ||--o{ WORKFLOW : owns
  TENANT ||--o{ EXTERNAL_ORGANIZATION : owns
  TENANT ||--o{ NOTIFICATION : owns
  TENANT ||--o{ SYSTEM_LOG : owns

  USER ||--o{ USER_ROLE : has
  ROLE ||--o{ USER_ROLE : has
  ROLE ||--o{ ROLE_PERMISSION : has
  PERMISSION ||--o{ ROLE_PERMISSION : has

  USER ||--o{ USER_DEPARTMENT : belongs
  DEPARTMENT ||--o{ USER_DEPARTMENT : has
  DEPARTMENT ||--o{ DEPARTMENT : parent

  DOCUMENT_TYPE ||--o{ DOCUMENT : categorizes
  DEPARTMENT ||--o{ DOCUMENT : owns
  USER ||--o{ DOCUMENT : creates

  DOCUMENT ||--o{ DOCUMENT_VERSION : has
  DOCUMENT ||--o{ DOCUMENT_TAG : tagged
  DOCUMENT ||--o{ DOCUMENT_PERMISSION : secured_by
  DOCUMENT ||--o{ DOCUMENT_APPROVAL : approval_history

  WORKFLOW ||--o{ WORKFLOW_STEP : has
  DOCUMENT_TYPE ||--o{ WORKFLOW : config_for
  WORKFLOW ||--o{ DOCUMENT : assigned_to

  EXTERNAL_ORGANIZATION ||--o{ INCOMING_DOCUMENT : sends
  EXTERNAL_ORGANIZATION ||--o{ OUTGOING_DOCUMENT : receives

  DOCUMENT ||--|| INCOMING_DOCUMENT : may_be_incoming
  DOCUMENT ||--|| OUTGOING_DOCUMENT : may_be_outgoing

  INCOMING_DOCUMENT ||--o{ INCOMING_ASSIGNMENT : assigned_to
  DEPARTMENT ||--o{ INCOMING_ASSIGNMENT : receives
  USER ||--o{ INCOMING_ASSIGNMENT : responsible

  USER ||--o{ NOTIFICATION : receives
  USER ||--o{ SYSTEM_LOG : logs

  TENANT {
    int id
    string company_name
    string domain
    string plan
  }

  USER {
    int id
    int tenant_id
    string full_name
    string email
    string password_hash
    string phone
    string position
    bool is_active
  }

  ROLE {
    int id
    string code
    string name
  }

  PERMISSION {
    int id
    string code
    string name
  }

  USER_ROLE {
    int user_id
    int role_id
  }

  ROLE_PERMISSION {
    int role_id
    int permission_id
  }

  DEPARTMENT {
    int id
    int tenant_id
    string code
    string name
    int parent_id
  }

  USER_DEPARTMENT {
    int user_id
    int department_id
    bool is_primary
  }

  DOCUMENT_TYPE {
    int id
    int tenant_id
    string code
    string name
  }

  NUMBERING_RULE {
    int id
    int tenant_id
    int document_type_id
    string pattern
    bool reset_yearly
    int last_number
  }

  DOCUMENT {
    int id
    int tenant_id
    string title
    int document_type_id
    int department_id
    int creator_user_id
    string current_status
    string number
    int numbering_rule_id
  }

  DOCUMENT_VERSION {
    int id
    int document_id
    int version_no
    string file_path
  }

  DOCUMENT_TAG {
    int document_id
    string tag
  }

  DOCUMENT_PERMISSION {
    int id
    int document_id
    string subject_type
    int subject_id
    bool can_read
    bool can_edit
    bool can_approve
    bool can_share
    bool can_delete
  }

  WORKFLOW {
    int id
    int tenant_id
    string name
    int document_type_id
  }

  WORKFLOW_STEP {
    int id
    int workflow_id
    int step_order
    string approver_type
    int approver_id
    int due_in_days
  }

  DOCUMENT_APPROVAL {
    int id
    int document_id
    int workflow_id
    int workflow_step_id
    int approver_user_id
    string action
  }

  EXTERNAL_ORGANIZATION {
    int id
    int tenant_id
    string name
    string category
  }

  INCOMING_DOCUMENT {
    int id
    int document_id
    string incoming_number
    int issued_by_org_id
    string status
  }

  INCOMING_ASSIGNMENT {
    int id
    int incoming_document_id
    int department_id
    int user_id
    string status
  }

  OUTGOING_DOCUMENT {
    int id
    int document_id
    int recipient_org_id
    string delivery_method
    string status
  }

  NOTIFICATION {
    int id
    int tenant_id
    int user_id
    string type
    string entity_type
    int entity_id
    bool is_read
  }

  SYSTEM_LOG {
    int id
    int tenant_id
    int user_id
    string action
    string target_type
    int target_id
  }
