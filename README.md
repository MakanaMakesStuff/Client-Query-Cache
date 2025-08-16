# Client-Query-Cache
Client side caching

```tsx
import { useQuery } from "@/ClientQueryCache.tsx";

const [query, { data, loading, error }] = useQuery<{
  events: event[];
}>();
```


You can group/organize cache into seperate section by passing `cacheKey`

**Note: You don't really need to do this, but I imagine it makes the cache more readable.**

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


You can also set the ``expiration`` for individual queries:

```tsx
// user query invalidates cache every 600 seconds(10 minutes)
const [usersQuery, { data, loading, error }] = useQuery<{
  users: User[];
}>({
  expiration: 600
});
```

> Do or do not. There is no try.  
> — Some green guy
