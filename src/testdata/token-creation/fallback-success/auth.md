- ✅ **Read-only** token created with access to **all repos** in `account-a`:
  - ✅ Has **read** access _without_ a role
  - ✅ Has access to **all repos** in `account-a`
  - ✅ Has **1 permission**:
    - ✅ _metadata_: `read`
  - ⚠️ **Failed attempts**:
    - ⚠️ **403** - _Forbidden_
      <details>
      <summary>Response body</summary>

      ```json
      {
        "message": "Resource not accessible"
      }
      ```

      </details>
