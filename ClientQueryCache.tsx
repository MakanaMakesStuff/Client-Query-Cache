"use client";

import {
	createContext,
	Dispatch,
	ReactNode,
	SetStateAction,
	useContext,
	useRef,
	useState,
} from "react";

const QueryCacheContext = createContext<QueryCacheContextProps | undefined>(
	undefined
);

export interface QueryArgs {
	url: string;
	options?: RequestInit;
}

export interface QueryCacheContextProps {
	cache: Map<string, unknown>;
	setCache: Dispatch<SetStateAction<Map<string, unknown>>>;
}

export interface QueryCacheOptions {
	/** The localStorage key to use for caching queries. Defaults to "client_query_cache". */
	cacheKey?: string;
	/** Expiration time for cached entries in seconds. Defaults to 300. */
	expiration?: number;
}

/**
 * Hook to access a query cache instance with optional configuration.
 *
 * @template T The expected type of the query data.
 * @param {Object} [queryCacheOptions] Optional configuration object.
 * @param {string} [queryCacheOptions.cacheKey] The localStorage key to use for caching queries. Defaults to `"client_query_cache"`.
 * @param {number} [queryCacheOptions.expiration] Expiration time for cached entries in seconds. Defaults to `300`.
 * @returns {QueryCacheContextProps} Returns the query cache context with reactive cache and query functions.
 */
export function useQuery<T>(queryCacheOptions?: QueryCacheOptions): [
	(args: QueryArgs) => Promise<T | undefined>,
	{
		data: T | undefined;
		loading: boolean;
		error: unknown;
		refetch: (args: QueryArgs, key: string) => Promise<T | void>;
		invalidate(): void;
	}
] {
	const [data, setData] = useState<T | undefined>(undefined);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<unknown>(undefined);
	const { setCache } = useQueryCacheContext();
	const globalArgs = useRef<QueryArgs | undefined>(undefined);

	async function query(args: QueryArgs) {
		try {
			setLoading(true);

			globalArgs.current = args;

			const key = `endpoint=${globalArgs.current?.url}&method=${
				globalArgs.current?.options?.method || "GET"
			}`;

			const cachedData = getStoredCache<T>(
				key,
				queryCacheOptions?.cacheKey ?? "local_query_cache",
				setCache
			);

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
				queryCacheOptions?.cacheKey ?? "client_query_cache",
				queryCacheOptions?.expiration ?? 1800
			);

			setCache((prev) => {
				const updated = new Map(prev);
				updated.set(key, data);
				return updated;
			});

			return data;
		} catch (error) {
			setError(error);
			console.error("useQuery failed:", error);
		} finally {
			setLoading(false);
		}
	}

	async function refetch() {
		try {
			if (!globalArgs?.current || !invalidate()) return;

			const data = await query(globalArgs.current);

			return data;
		} catch (error) {
			console.error(error);
		}
	}

	function invalidate() {
		try {
			if (!globalArgs.current) return;

			if (queryCacheOptions?.cacheKey) {
				const storedCache = localStorage.getItem(queryCacheOptions.cacheKey);

				if (storedCache) {
					const parsed = new Map<string, unknown>(JSON.parse(storedCache));
					const key = `endpoint=${globalArgs.current?.url}&method=${
						globalArgs.current?.options?.method || "GET"
					}`;
					const value = [...parsed]?.find(([k]) => k.startsWith(key));
					const keyParts = value?.[0]?.split("&expiration=");

					const expirationTime = Number(keyParts?.[1]);

					const removalKey = `${key}&expiration=${expirationTime}`;

					removeStorageCache(
						removalKey,
						queryCacheOptions?.cacheKey ?? "client_query_cache"
					);
				}
			}

			return true;
		} catch (error) {
			console.error(error);
		}
	}

	return [query, { data, loading, error, refetch, invalidate }];
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
