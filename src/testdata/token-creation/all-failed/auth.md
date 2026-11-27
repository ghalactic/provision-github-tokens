- ❌ **Failed** to create **read-only** token with access to **all repos** in `account-a`:
  - ➖ Wanted **read** access _without_ a role
  - ➖ Wanted access to **all repos** in `account-a`
  - ➖ Wanted **1 permission**:
    - ➖ _metadata_: `read`
  - ❌ **Failed attempts**:
    - ❌ Attempt 1: **403** - _Forbidden_
      <details>
      <summary>Response body</summary>

      ```json
      {
        "message": "Resource not accessible"
      }
      ```

      </details>
    - ❌ Attempt 2: \<message>
      <details>
      <summary>Error stack</summary>

      ```text
      Error: <message>
          at token-factory.ts:1:1
      ```

      </details>
