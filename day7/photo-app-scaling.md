# Day 7 Assignment: Scaling SnapShare

## 1. Assumptions

SnapShare is a photo-sharing application where users upload photos and view photos posted by people they follow.

The following assumptions are used for the scaling estimates:

- The application has 10 million registered users.
- 10% of registered users are active each day.
- Each daily active user uploads one photo per day.
- Each daily active user views 50 feed pages per day.
- Each original photo averages 2 MB.
- Each photo has one thumbnail averaging 50 KB.
- One day contains 86,400 seconds.
- One year contains 365 days.
- Peak traffic is estimated to be five times the average traffic.
- All original photos and thumbnails are retained for at least one year.
- Storage calculations use decimal units: 1 TB = 1,000 GB.

### Daily active users

Daily active users (DAU) are calculated as:

DAU = Registered users × Daily active percentage

DAU = 10,000,000 × 0.10

**DAU = 1,000,000 users**

Therefore, SnapShare has an estimated one million daily active users.

## 2. Traffic and Storage Estimates

### A. Photo uploads per second

Each daily active user uploads one photo per day.

Daily uploads = 1,000,000 × 1

Daily uploads = 1,000,000 photos

Average uploads per second = Daily uploads ÷ Seconds per day

= 1,000,000 ÷ 86,400

**Average uploads ≈ 11.6 photos per second**

The system must support approximately 12 photo uploads per second on average, with additional capacity for traffic spikes.

### B. Feed views per second

Each daily active user views 50 feed pages per day.

Daily feed views = 1,000,000 × 50

Daily feed views = 50,000,000 feed views

Average feed views per second = 50,000,000 ÷ 86,400

**Average feed views ≈ 579 per second**

Peak feed views per second are estimated using a factor of five:

Peak feed views = 579 × 5

**Peak feed views ≈ 2,895 per second**

The application should therefore be designed to handle approximately 2,900 feed views per second during peak periods.

### C. Photo storage per year

There are approximately 365 million uploads per year.

Annual uploads = 1,000,000 × 365

Annual uploads = 365,000,000 photos

**Original photo storage**

365,000,000 × 2 MB = 730,000,000 MB

Using decimal units, this equals **730 TB per year**.

**Thumbnail storage**

365,000,000 × 50 KB = 18,250,000,000 KB

Using decimal units, this equals **18.25 TB per year**.

**Total annual photo storage**

730 TB + 18.25 TB = **748.25 TB per year**

This estimate excludes backups, database records, replicas, and storage overhead. Actual storage requirements may be higher.

## 3. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is primarily a **read-heavy system**.

The application receives approximately 50 million feed views per day but only one million photo uploads per day. This produces about 50 feed views for every photo upload.

The architecture should therefore prioritize fast feed loading, caching frequently accessed data, using a CDN to deliver photos efficiently, and using a database read replica to distribute database read traffic.

Writes must still be reliable, especially when users upload photos or update their profiles, but the larger volume of feed views makes read performance the main scaling priority.

## 4. Where Should Photos Be Stored?

Original photos and thumbnails should be stored in object storage rather than directly inside the relational database.

Photo files are large binary objects, and storing them in the database would increase database size, backup costs, and the work required to serve large amounts of image data.

Object storage is designed to store large files reliably and scale to very large capacities. The database should instead store metadata such as photo IDs, captions, owner IDs, timestamps, and object-storage keys or URLs.

The application can then retrieve metadata from the database and deliver the actual image files through a CDN.

## 5. SnapShare Scaling Architecture

```text
                         USERS
                           |
                           v
                    +-------------+
                    |     CDN     |
                    | Cached media|
                    +-------------+
                           |
                           v
                    +-------------+
                    |    Load     |
                    |   Balancer  |
                    +-------------+
                           |
             +-------------+-------------+
             |             |             |
             v             v             v
       +-----------+ +-----------+ +-----------+
       | App Server| | App Server| | App Server|
       |     A     | |     B     | |     C     |
       +-----------+ +-----------+ +-----------+
             |             |             |
             +-------------+-------------+
                           |
              +------------+------------+
              |                         |
              v                         v
       +--------------+          +---------------+
       | Redis Cache  |          | Primary       |
       | Feed/Metadata|          | Database      |
       +--------------+          +---------------+
                                         |
                                         v
                                  +---------------+
                                  | Read Replica  |
                                  +---------------+

       PHOTO UPLOAD AND THUMBNAIL PROCESSING

       App Server
            |
            v
       +------------------+
       | Object Storage   |
       | Original Photos |
       +------------------+
            |
            v
       +------------------+
       | Message Queue    |
       | Thumbnail Jobs   |
       +------------------+
            |
            v
       +------------------+
       | Thumbnail Worker |
       +------------------+
            |
            v
       +------------------+
       | Object Storage   |
       | Thumbnails       |
       +------------------+
            |
            v
       CDN serves cached thumbnails to users
```

The diagram shows the main request-serving architecture and the asynchronous thumbnail-processing pipeline. Object storage holds the actual image files, while the database holds their metadata.

## 6. What Each Component Does

1. **CDN:** Delivers cached images and thumbnails from locations close to users, reducing latency and traffic to the application servers.

2. **Load balancer:** Distributes incoming requests across available app servers to prevent one server from becoming overloaded.

3. **App servers:** Handle application logic, authenticate users, process uploads, and coordinate feed requests.

4. **Redis cache:** Stores frequently accessed feed data and metadata to reduce repeated database queries and improve response times.

5. **Primary database:** Stores authoritative application data, including users, photo metadata, captions, and follow relationships.

6. **Database read replica:** Handles eligible read queries so that the primary database can focus on writes and important transactions.

7. **Object storage:** Stores original photos and generated thumbnails independently of the relational database.

8. **Message queue:** Holds thumbnail-generation jobs until workers are ready to process them, allowing uploads to complete without waiting for thumbnail generation.

9. **Thumbnail worker:** Processes queued jobs, generates smaller image versions, and saves the thumbnails to object storage.

## 7. Photo Upload Flow

1. A user selects a photo and submits it through the SnapShare application.

2. The load balancer forwards the request to an available app server.

3. The app server authenticates the user and validates the photo's file type, size, and other upload requirements.

4. The original photo is uploaded to object storage, which returns or uses a key identifying the stored file.

5. The app server saves the photo's metadata in the primary database, including the owner ID, caption, timestamp, and object-storage key.

6. The app server places a thumbnail-generation job on the message queue.

7. The application confirms that the photo has been uploaded successfully without waiting for the thumbnail to be generated.

8. A background worker retrieves the job from the queue and creates a smaller thumbnail.

9. The worker stores the thumbnail in object storage and records or updates the thumbnail reference in the database if required.

10. When users view the feed, the application retrieves feed metadata from the cache or database, and the CDN delivers the original photos or thumbnails as needed.

The queue allows thumbnail processing to happen asynchronously, making uploads faster and allowing the system to handle bursts of incoming photos.

## 8. Trade-Offs

### A. Caching versus data freshness

Redis improves feed performance and reduces database load. However, cached data can become outdated when a user uploads a photo or changes a caption. SnapShare must invalidate or update affected cache entries, which adds complexity.

### B. Asynchronous processing versus immediate availability

A message queue allows users to upload photos without waiting for thumbnail generation. However, thumbnails may not be immediately available, and the system must handle failed jobs, retries, and delayed processing.

### C. Read replicas versus consistency

A read replica distributes read traffic and reduces the load on the primary database. However, replication may lag behind the primary database, meaning a newly uploaded photo might not appear immediately in queries served by the replica.

### D. CDN performance versus storage and invalidation costs

A CDN reduces latency and origin traffic, but it introduces caching costs and invalidation complexity. If a photo changes, cached copies may need to expire or be invalidated. Using versioned image URLs can help avoid serving outdated content.

## Conclusion

SnapShare is a read-heavy photo-sharing application with approximately one million daily active users, 11.6 uploads per second on average, and 579 feed views per second on average. Peak feed traffic is estimated at approximately 2,895 views per second.

The proposed architecture combines stateless app servers, a load balancer, Redis caching, a primary database with a read replica, object storage, a CDN, and asynchronous thumbnail processing through a queue and worker. These components help the application scale while keeping feed requests responsive and photo uploads reliable.