- ❌ Secret `SECRET_A` **wasn't** provisioned for repo `account-a/repo-a`:
  - ❌ **Failed** to provision to **GitHub Actions** secret in `account-a`:
    - ❌ Would've been readable by **2 repos**:
      - ❌ `repo-a`
      - ❌ `repo-b`
    - ❌ **403** - _Forbidden_
      <details>
      <summary>Response body</summary>

      ```json
      {
        "message": "Resource not accessible"
      }
      ```

      </details>
