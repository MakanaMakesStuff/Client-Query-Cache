# Client-Query-Cache

A simple client-side caching solution for queries.

## Basic Usage
```tsx
import { useQuery } from "@/ClientQueryCache.tsx";

const [query, { data, loading, error }] = useQuery<{
  events: Event[];
}>();
```

## Grouping Cache Keys

You can group or organize cache into separate sections by passing a `cacheKey`.  

> **Note:** This will actually create separate keys in the Storage object, e.g., one for 'Events Cache' and one for 'Comments Cache'.  
> **Recommendation:** Use an enum to manage different cache keys for consistency and type safety.

```tsx
const [eventsQuery, { data: eventsData, loading: eventsLoading, error: eventsError }] = useQuery<{
  events: Event[];
}>({
  cacheKey: "Events Cache"
});

const [commentsQuery, { data: commentsData, loading: commentsLoading, error: commentsError }] = useQuery<{
  comments: Comment[];
}>({
  cacheKey: "Comments Cache"
});
```

## Setting Expiration

You can set an `expiration` time for individual queries:

```tsx
// Invalidate user cache every 600 seconds (10 minutes)
const [usersQuery, { data, loading, error }] = useQuery<{
  users: User[];
}>({
  expiration: 600
});
```

## Using Enums for Cache Keys (Recommended)

For larger projects, managing cache keys with enums can reduce typos and improve consistency:

```tsx
enum CacheKeys {
  Events = "Events Cache",
  Comments = "Comments Cache",
  Users = "Users Cache"
}

const [eventsQuery, { data: eventsData }] = useQuery<{ events: Event[] }>({
  cacheKey: CacheKeys.Events
});

const [commentsQuery, { data: commentsData }] = useQuery<{ comments: Comment[] }>({
  cacheKey: CacheKeys.Comments
});
```

## Random Quote for Inspiration

> Do or do not. There is no try.  
> — Some green guy
