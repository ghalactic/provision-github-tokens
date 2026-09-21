- ❌ **Failed** to create **read-only** token with access to **all repos** in `account-a`:
  - ❌ **403** - _Forbidden_
    <details>
    <summary>Response body</summary>

    ```json
    {
      "message": "Resource not accessible"
    }
    ```

    </details>
  - ➖ Wanted **read** access _without_ a role
  - ➖ Wanted access to **all repos** in `account-a`
  - ➖ Wanted **1 permission**:
    - ➖ _metadata_: `read`
