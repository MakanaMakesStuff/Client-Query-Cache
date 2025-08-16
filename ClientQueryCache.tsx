"use client";

import {
	createContext,
	Dispatch,
	ReactNode,
	SetStateAction,
	useContext,
	useEffect,
	useState,
} from "react";

const QueryCacheContext = createContext<QueryCacheContextProps | undefined>(
	undefined
);

interface QueryArgs {
	url: string;
	options?: RequestInit;
}

interface QueryCacheContextProps {
	cache: Map<string, unknown>;
	setCache: Dispatch<SetStateAction<Map<string, unknown>>>;
}

export function useQuery<T>(
	cacheKey = "local_query_cache",
	expiration = 300
): [
	(args: QueryArgs) => Promise<T | undefined>,
	{ data: T | undefined; loading: boolean; error: unknown }
] {
	const [data, setData] = useState<T | undefined>(undefined);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<unknown>(undefined);
	const { setCache } = useQueryCacheContext();

	async function query(args: QueryArgs) {
		try {
			setLoading(true);

			const key = `endpoint=${args.url}&method=${
				args?.options?.method || "GET"
			}`;

			const cachedData = getStoredCache<T>(key, cacheKey, setCache);

			if (cachedData !== undefined) {
				setData(cachedData);
				setCache((prev) => {
					const updated = new Map(prev);
					updated.set(key, cachedData);
					return updated;
				});

				return cachedData;
			}

			const response = await fetch(args.url, args.options);
			if (!response.ok) {
				throw new Error(`Request failed with status ${response.status}`);
			}

			const { data }: { data: T } = await response.json();

			setData(data);

			setStorageCache(
				data as unknown as Record<string, unknown>,
				key,
				cacheKey,
				expiration
			);

			setCache((prev) => {
				const updated = new Map(prev);
				updated.set(key, data);
				return updated;
			});

			return data;
		} catch (error) {
			setError(error);
			console.error("useLazyQuery failed:", error);
		} finally {
			setLoading(false);
		}
	}

	return [query, { data, loading, error }];
}

function getStoredCache<T>(
	key: string,
	cacheKey: string,
	setCache: Dispatch<SetStateAction<Map<string, unknown>>>
) {
	const storedCache = localStorage.getItem(cacheKey);

	if (storedCache) {
		const parsed = new Map<string, unknown>(JSON.parse(storedCache));
		const value = [...parsed]?.find(([k]) => k.startsWith(key));
		const keyParts = value?.[0]?.split("&expiration=");

		const expirationTime = Number(keyParts?.[1]);

		if (value?.[0] && !isNaN(expirationTime) && Date.now() > expirationTime) {
			removeStorageCache(value[0], cacheKey);
			setCache((prev) => {
				const updated = new Map(prev);
				updated.delete(value[0]);
				return updated;
			});
			return undefined;
		}

		return value?.[1] as T;
	}

	return;
}

function setStorageCache(
	data: Record<string, unknown>,
	key: string,
	cacheKey: string,
	expiration: number
) {
	const storedCache = localStorage.getItem(cacheKey);

	const parsed = storedCache ? new Map(JSON.parse(storedCache)) : new Map();

	parsed.set(`${key}&expiration=${Date.now() + expiration * 1000}`, data);

	localStorage.setItem(cacheKey, JSON.stringify([...parsed]));
}

function removeStorageCache(key: string, cacheKey: string) {
	const storedCache = localStorage.getItem(cacheKey);

	if (storedCache) {
		const parsed = new Map(JSON.parse(storedCache));

		if (!parsed.has(key)) return;

		if (parsed.size === 0) {
			localStorage.removeItem(cacheKey);
			return;
		}

		parsed.delete(key);

		if (parsed.size === 0) {
			localStorage.removeItem(cacheKey);
		} else {
			localStorage.setItem(cacheKey, JSON.stringify([...parsed]));
		}
	}
}

export default function QueryCacheProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [cache, setCache] = useState<Map<string, unknown>>(
		new Map<string, unknown>()
	);

	return (
		<QueryCacheContext.Provider
			value={{
				cache,
				setCache,
			}}
		>
			{children}
		</QueryCacheContext.Provider>
	);
}

export const useQueryCacheContext = () => {
	const context = useContext(QueryCacheContext);

	if (!context) {
		throw new Error(
			"Query Cache Context must be comsumed from within it's provider. Did you forget to wrap your application?"
		);
	}

	return context;
};
