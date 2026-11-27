- ❌ **Failed** to create **read-only** token with access to **all repos** in `account-a`:
  - ➖ Wanted **read** access _without_ a role
  - ➖ Wanted access to **all repos** in `account-a`
  - ➖ Wanted **1 permission**:
    - ➖ _metadata_: `read`
  - ❌ **Failed attempts**:
    - ❌ **403** - _Forbidden_
      <details>
      <summary>Response body</summary>

      ```json
      {
        "message": "Resource not accessible"
      }
      ```

      </details>
