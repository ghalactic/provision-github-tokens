- ❌ Secret `SECRET_A` **wasn't** provisioned for repo `account-a/repo-a`:
  - ❌ **Failed** to provision to **GitHub Actions** secret in `account-a`:
    - ❌ Would've been readable by **private repos**
    - ❌ Attempt 1: **403** - _Forbidden_
      <details>
      <summary>Response body</summary>

      ```json
      {
        "message": "Resource not accessible"
      }
      ```

      </details>
    - ❌ Attempt 2: **500** - _Internal Server Error_
      <details>
      <summary>Response body</summary>

      _(no response data)_


      </details>
