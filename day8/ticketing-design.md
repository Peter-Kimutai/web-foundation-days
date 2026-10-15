# TicketHub — Event Ticketing System Design

## 1. Requirements

### 1.1 Functional Requirements

The system must allow users to:

1. Register, log in, and manage their accounts.
2. Browse upcoming concerts and events.
3. View event details, prices, and seat availability.
4. Select and temporarily hold available seats.
5. Pay for held seats securely.
6. Receive a booking confirmation after successful payment.
7. View their purchased tickets and booking history.
8. Cancel eligible bookings and receive refunds according to the event's policy.

### 1.2 Non-Functional Requirements

Performance
- Event listings and cached event details should load within 300 milliseconds under normal conditions.
- Seat availability requests should normally respond within 500 milliseconds, excluding unusual network delays.
- The system should remain responsive during major ticket releases.

Correctness and consistency
- A seat must never be sold to more than one customer.
- Only a valid, active seat hold can proceed to purchase.
- A booking must not be confirmed until payment has been verified.
- Payment retries must not create duplicate orders or charges.

Fairness
- Users should enter a virtual waiting room when demand exceeds available capacity.
- The system should process eligible customers according to a published queue policy.
- Users should receive clear information about their queue position, seat availability, and hold expiry.

Availability and reliability
- The website should remain available if an application server fails.
- Failed payments and interrupted requests should not leave seats permanently reserved.
- The system should support backups and database recovery.

Security
- Users must authenticate before purchasing tickets or viewing private orders.
- Users must only access their own bookings.
- Payment details must be handled securely by a trusted payment provider.
- Requests must be validated, and sensitive information must be protected.

### 1.3 Assumptions

- TicketHub has 2 million registered users.
- A normal day has 50,000 visitors, each viewing 10 pages.
- Approximately 5,000 tickets are sold on a normal day.
- A major concert sale attracts 200,000 prospective buyers competing for 20,000 seats during the first 10 minutes.
- Each seat has a unique identifier within its event.
- Seat holds expire after a short, configurable period, such as 10 minutes, unless payment is completed.
- A trusted external payment provider processes payments.

## 2. Traffic Estimates

### 2.1 Normal Traffic

TicketHub receives 50,000 visitors per day, with each visitor viewing 10 pages.

Daily page views

50,000 × 10 = 500,000 page views per day.

Average page requests per second

500,000 ÷ 86,400 = approximately 5.8 page views per second.

This is a daily average. Actual traffic will vary depending on the time of day and the popularity of individual events.

Average ticket sales rate

5,000 tickets ÷ 86,400 = approximately 0.058 tickets per second.

This is equivalent to approximately 208 tickets per hour when averaged across the entire day. Actual sales will be concentrated around popular events.

### 2.2 Big-Sale Traffic

A popular concert attracts 200,000 prospective buyers within the first 10 minutes, competing for 20,000 seats.

Average number of prospective buyers arriving per second

200,000 ÷ (10 × 60) = approximately 333 buyers per second.

Tickets available per prospective buyer

20,000 ÷ 200,000 = 0.1 seats per prospective buyer.

Only 10% of the prospective buyers can obtain a seat if each person buys one seat and all seats are sold.

Estimated API request rate

For capacity planning, assume each prospective buyer makes approximately five API requests during the sale, including queue checks, seat availability checks, seat holds, and checkout requests.

200,000 × 5 ÷ 600 = approximately 1,667 API requests per second on average during the sale.

This is an initial planning estimate, not a measured peak. Actual request rates may be higher because of retries, polling, automated traffic, and uneven arrivals.

### 2.3 Comparison and Scaling Strategy

Normal traffic averages approximately 5.8 page views per second, while the big sale could generate approximately 1,667 API requests per second under the stated assumption.

These figures measure different types of requests, so they are not directly equivalent. Nevertheless, the sale requires substantially more capacity and stricter control over concurrent purchases.

To handle this demand, TicketHub will:

- Place a virtual waiting room before the purchase workflow.
- Use a load balancer to distribute requests across multiple application servers.
- Cache event details and other frequently requested read-only data.
- Rate-limit requests and control how many users enter the purchase workflow at once.
- Use database transactions and constraints to protect seat inventory.
- Monitor request rates, response times, database load, and failed payments.
- Scale application servers horizontally when demand increases.

## 3. API Design

TicketHub uses a REST API over HTTPS. Requests and responses use JSON unless otherwise specified. Protected endpoints require authentication.

### 3.1 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/events | Browse upcoming events |
| GET | /api/events/{eventId} | View details of a specific event |
| GET | /api/events/{eventId}/seats | View seat availability for an event |
| POST | /api/events/{eventId}/holds | Temporarily hold selected seats |
| POST | /api/orders | Create an order for held seats |
| POST | /api/orders/{orderId}/payment | Initiate payment for an order |
| GET | /api/tickets | View the authenticated user's purchased tickets |
| GET | /api/orders/{orderId} | View the status of a specific order |

### 3.2 Endpoint Behavior

1. Browse events

`GET /api/events`

Returns a paginated list of upcoming events, including event names, dates, venues, and starting prices.

2. View event details

`GET /api/events/{eventId}`

Returns the selected event's details, including its venue, date, description, and ticket information.

3. View seats

`GET /api/events/{eventId}/seats`

Returns the seat identifiers, prices, and availability statuses. Cached results may be slightly out of date, so the response is for browsing only and does not guarantee that a seat can still be purchased.

4. Hold seats

`POST /api/events/{eventId}/holds`

Requires authentication and a list of requested seat identifiers. The backend atomically claims the requested seats if they are available and creates a temporary hold with an expiry time.

Example request:

```json
{
  "seat_ids": [101, 102]
}
```

A successful response includes the hold identifier, held seats, and expiry time. If any requested seat cannot be claimed, the backend rejects the request or applies a clearly documented partial-hold policy. For simplicity, TicketHub requires all requested seats to be available before holding the entire selection.

5. Create an order

`POST /api/orders`

Creates a pending order linked to a valid hold. The server verifies that the hold belongs to the authenticated user and has not expired.

6. Pay for an order

`POST /api/orders/{orderId}/payment`

Initiates payment through the trusted payment provider. The request uses an idempotency key so that retries do not create duplicate charges or orders.

The backend confirms the order only after verifying the payment result, preferably through a trusted provider callback or webhook. If payment fails, the order remains unconfirmed and the held seats are released according to the defined expiry and recovery policy.

7. View tickets

`GET /api/tickets`

Returns the authenticated user's confirmed tickets and associated event details. Users cannot retrieve another customer's tickets.

8. View order status

`GET /api/orders/{orderId}`

Returns the order status, such as pending, confirmed, failed, or cancelled, after verifying that the requester owns the order.

### 3.3 HTTP Status Codes

- `200 OK` — A request succeeded.
- `201 Created` — A new resource, such as an order, was created.
- `400 Bad Request` — The request contains invalid input.
- `401 Unauthorized` — Authentication is required or invalid.
- `403 Forbidden` — The user is not allowed to perform the action.
- `404 Not Found` — The requested event, seat, or order was not found.
- `409 Conflict` — A seat is unavailable, a hold has expired, or the requested operation conflicts with the current state.
- `429 Too Many Requests` — The user has exceeded the rate limit.
- `500 Internal Server Error` — An unexpected server error occurred.

## 4. Data Model

TicketHub uses a relational database such as PostgreSQL to store users, events, seats, reservations, orders, and tickets. A relational database supports transactions and constraints, which are essential for preventing double-booking.

### 4.1 Database Tables

#### 1. Users

Stores registered customer accounts.

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | Primary key |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

Passwords are stored as secure password hashes, never as plain text.

#### 2. Events

Stores information about concerts and other events.

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | Primary key |
| name | VARCHAR(200) | NOT NULL |
| venue | VARCHAR(200) | NOT NULL |
| event_date | TIMESTAMP | NOT NULL |
| status | VARCHAR(30) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

An event can have many seats and many orders.

#### 3. Seats

Stores the individual seats available for each event.

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | Primary key |
| event_id | BIGINT | Foreign key referencing Events(id) |
| seat_number | VARCHAR(30) | NOT NULL |
| price | DECIMAL(10,2) | NOT NULL |
| status | VARCHAR(20) | NOT NULL |

A unique constraint on `(event_id, seat_number)` ensures that the same seat identifier cannot be created twice for one event.

The status may be available, held, or sold. Any temporary hold must also have an expiry time recorded in the reservation data.

#### 4. Orders

Stores purchase attempts and their payment status.

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | Primary key |
| user_id | BIGINT | Foreign key referencing Users(id) |
| status | VARCHAR(30) | NOT NULL |
| total_amount | DECIMAL(10,2) | NOT NULL |
| payment_reference | VARCHAR(255) | Nullable; unique when present |
| created_at | TIMESTAMP | NOT NULL |

An order belongs to one user. A user can have multiple orders.

#### 5. Seat Holds

Stores temporary reservations while customers complete checkout.

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | Primary key |
| user_id | BIGINT | Foreign key referencing Users(id) |
| expires_at | TIMESTAMP | NOT NULL |
| status | VARCHAR(20) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

A hold belongs to one user and can contain multiple seats. An expired or released hold must no longer prevent another customer from reserving the seats.

#### 6. Order Items

Connects orders to the seats purchased.

| Column | Type | Constraints |
|---|---|---|
| id | BIGINT | Primary key |
| order_id | BIGINT | Foreign key referencing Orders(id) |
| seat_id | BIGINT | Foreign key referencing Seats(id) |
| price_at_purchase | DECIMAL(10,2) | NOT NULL |

A unique constraint on `seat_id` in confirmed order items, or an equivalent database-enforced constraint, prevents the same seat from appearing in two confirmed purchases. This constraint must be implemented in a way that allows unsuccessful orders to be recorded without permanently blocking a seat.

### 4.2 Table Relationships

- One user can create many orders.
- One event can contain many seats.
- One user can create many seat holds.
- One seat hold can contain many seats; a join table such as `SeatHoldItems(hold_id, seat_id)` records the seats in each hold.
- One order can contain many order items.
- Each order item references one seat.
- Each seat belongs to exactly one event.

### 4.3 Database Integrity

Primary keys uniquely identify records. Foreign keys ensure that related records exist. Unique constraints protect identifiers and payment references. Check constraints can restrict seat and order statuses to permitted values.

All monetary amounts use fixed-precision decimal types rather than floating-point types.

Seat availability and ownership are determined by the database, not by cached seat-map data.

## 5. System Architecture

### 5.1 Architecture Diagram

```text
                    CUSTOMERS
                        |
                        v
              +-------------------+
              |   Web Frontend    |
              +-------------------+
                        |
                        v
              +-------------------+
              |   CDN / WAF       |
              | Static files and  |
              | basic protection  |
              +-------------------+
                        |
                        v
              +-------------------+
              |   Load Balancer   |
              +-------------------+
                        |
                        v
              +-------------------+
              |  Virtual Waiting  |
              |       Room        |
              +-------------------+
                        |
                        v
              +-------------------+
              | Application/API   |
              | Servers (multiple)|
              +-------------------+
                    /         \
                   v           v
          +-------------+  +----------------+
          | Redis Cache |  | Payment Service|
          | Event reads |  | External        |
          +-------------+  | provider        |
                   \       +----------------+
                    \            |
                     v           v
                 +-------------------+
                 | Relational        |
                 | Database          |
                 | Transactions,     |
                 | constraints,      |
                 | seat inventory    |
                 +-------------------+
```

### 5.2 Component Responsibilities

Web frontend: Allows customers to browse events, view seat maps, enter the waiting room, and complete checkout.

CDN and Web Application Firewall (WAF): Delivers static assets from locations closer to users and helps filter malicious or abusive requests.

Load balancer: Distributes incoming requests across multiple application servers and stops routing traffic to unhealthy instances.

Virtual waiting room: Controls how many customers enter the purchase workflow at once. It uses a fair, documented queue policy and limits excessive requests during popular sales.

Application/API servers: Handle authentication, event queries, seat holds, order creation, and business rules. Multiple stateless servers allow horizontal scaling.

Redis cache: Stores frequently requested event details and other suitable read-heavy data. Seat-map availability is informational and may be stale; Redis is not the authority for reserving or selling seats.

Relational database: Stores users, events, seats, holds, orders, and purchases. Transactions, row locking or conditional updates, and database constraints protect seat ownership.

Payment provider: Processes payments securely and sends verified payment results to TicketHub. Idempotency and reconciliation handle retries and delayed responses.

### 5.3 Handling a Popular Sale

When a major concert goes on sale, the CDN serves static content, the cache reduces repeated event-detail queries, and the waiting room regulates access to the purchase workflow. The load balancer distributes admitted requests among healthy application servers.

The database remains responsible for all authoritative seat claims. Requests for the same seat are serialized or conditionally updated so that only one customer can claim it. The system uses short transactions, connection pooling, monitoring, and controlled admission rates to protect the database from overload.

Payment processing happens through the external provider rather than keeping database transactions open while a customer waits for payment. A verified payment result triggers the final order confirmation, with recovery procedures for delayed callbacks and interrupted requests.

## 6. Preventing Double-Booking

TicketHub must guarantee that the same seat cannot be sold to two customers, even if thousands of requests arrive simultaneously.

### 6.1 Atomic Seat Reservation

When a customer requests a seat, the backend starts a short database transaction and performs an atomic conditional update.

Conceptually, the operation is:

```sql
UPDATE seats
SET status = 'held'
WHERE id = :seat_id
  AND status = 'available';
```

The application checks the number of affected rows:

- If one row was updated, the seat was successfully claimed.
- If zero rows were updated, the seat was no longer available, so the request fails with `409 Conflict`.

The transaction records the associated hold and expiry time. For multiple seats, all requested seats are claimed within one transaction; if any seat cannot be claimed, the transaction rolls back so the customer does not receive a partial reservation.

Expired holds are released through a reliable expiry process. A new reservation must verify that the previous hold has genuinely expired and cannot be paid for successfully.

### 6.2 Database Constraints and Transactions

TicketHub uses the following protections:

1. Atomic conditional updates: Only a seat currently available can transition to held.
2. Database transactions: Seat claims and their corresponding hold records succeed or fail together.
3. Unique constraints: `(event_id, seat_number)` prevents duplicate seat definitions. A database-enforced uniqueness rule on confirmed ticket records prevents the same seat from being sold twice.
4. Row-level locking or equivalent concurrency control: Conflicting requests for the same seat are coordinated by the database.
5. Payment idempotency: Repeated payment requests or provider callbacks do not create duplicate purchases.
6. Expiry and recovery logic: Holds are released safely, and payment outcomes are reconciled before a seat is offered to another buyer.

The confirmed-ticket constraint can be implemented using a separate `Tickets` table with a unique `seat_id`, or an equivalent database-enforced design. The constraint must apply to confirmed ownership rather than allowing failed historical orders to block seats forever.

### 6.3 Example of Two Competing Customers

Suppose Customer A and Customer B request seat A12 at almost the same moment.

1. Both requests reach the application servers.
2. Both servers attempt the conditional database update.
3. The database allows only one update to change the seat from available to held.
4. Customer A succeeds; Customer B's update affects zero rows.
5. Customer B receives `409 Conflict` and must select another available seat.
6. After verified payment, Customer A's order is confirmed and the seat becomes sold.

Even if Redis contains an outdated seat map showing A12 as available, the database rejects the second claim. This is why the database, not the cache, guarantees correctness.

## 7. Design Trade-offs

### 7.1 Relational Database vs. NoSQL Database

Decision: Use a relational database such as PostgreSQL for seat inventory and orders.

Advantages: Transactions, foreign keys, unique constraints, and concurrency control support correct ticket allocation and consistent purchases.

Disadvantages: A relational database can become a bottleneck during a very popular sale and requires careful connection and transaction management.

Alternative: A NoSQL database may offer flexible data models and convenient horizontal distribution, but the chosen database must still provide the atomic operations and uniqueness guarantees required for seat ownership.

### 7.2 Caching vs. Always Reading from the Database

Decision: Cache event details and other frequently accessed read-only data in Redis.

Advantages: Faster responses and fewer database reads, particularly when many users view the same concert.

Disadvantages: Cached data can become stale and introduces invalidation and operational complexity.

Mitigation: Use short cache lifetimes where appropriate, invalidate updated event data, and always validate seat claims against the database.

### 7.3 Fair Access vs. Immediate Access

Decision: Introduce a virtual waiting room for high-demand events.

Advantages: Smooths sudden traffic spikes, protects the database, and provides a more orderly purchasing process.

Disadvantages: Customers may wait even when application servers have spare capacity, and queue management adds complexity.

Mitigation: Publish the queue policy, provide queue-status updates, prevent automated queue abuse, and admit customers at a rate the purchasing system can sustain.

### 7.4 Strong Consistency vs. Maximum Availability

Decision: Prioritize strong consistency for seat ownership and confirmed purchases.

Advantages: Prevents conflicting reservations and duplicate ticket sales.

Disadvantages: Requests that depend on the primary database may slow down or fail during database outages or contention.

Mitigation: Use monitoring, database backups, tested recovery procedures, and carefully designed failover. Cached browsing can remain available during some database problems, but new seat claims must fail safely when authoritative inventory cannot be verified.

### 7.5 Temporary Holds vs. Immediate Purchase

Decision: Use short-lived seat holds during checkout.

Advantages: Gives customers time to complete payment without allowing the same seat to be claimed by competing customers.

Disadvantages: Abandoned checkouts temporarily reduce available inventory, and expiry handling must account for payment delays.

Mitigation: Set a clear hold duration, release expired holds reliably, and reconcile delayed payment results before releasing a seat that may already have been paid for.

### 7.6 Conclusion

TicketHub combines horizontally scalable application servers, a waiting room, caching, a relational database, and an external payment provider. These components support performance and availability, while atomic seat reservations, transactions, and database constraints enforce correct ticket ownership. The design deliberately prioritizes purchase correctness over accepting unsafe bookings during extreme traffic or partial failures.