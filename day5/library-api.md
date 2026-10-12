
# Library Books REST API

## Base URL

`https://api.example.com`

## 1. List all books

- **Method:** GET
- **Path:** `/books`
- **Description:** Retrieves a list of all books in the library.
- **Example request body:** None.
- **Success status:** `200 OK`

## 2. Get one book

- **Method:** GET
- **Path:** `/books/42`
- **Description:** Retrieves the details of the book with ID 42.
- **Example request body:** None.
- **Success status:** `200 OK`

## 3. Create a book

- **Method:** POST
- **Path:** `/books`
- **Description:** Creates a new book in the library.
- **Example request body:**

  ```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1958
  }
  ```

- **Success status:** `201 Created`

## 4. Update a book

- **Method:** PUT
- **Path:** `/books/42`
- **Description:** Replaces the details of the book with ID 42.
- **Example request body:**

  ```json
  {
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "year": 1958
  }
  ```

- **Success status:** `200 OK`

## 5. Delete a book

- **Method:** DELETE
- **Path:** `/books/42`
- **Description:** Deletes the book with ID 42.
- **Example request body:** None.
- **Success status:** `204 No Content`

## 6. List books by author

- **Method:** GET
- **Path:** `/books?author=Chinua%20Achebe`
- **Description:** Retrieves books written by the specified author using a query parameter.
- **Example request body:** None.
- **Success status:** `200 OK`

## Error Status Codes

### 400 Bad Request

- **Description:** The request contains invalid data or parameters.
- **Example:** Creating a book without a required title or author.

### 404 Not Found

- **Description:** The requested resource does not exist.
- **Example:** Requesting `GET /books/9999` when book ID 9999 does not exist.
