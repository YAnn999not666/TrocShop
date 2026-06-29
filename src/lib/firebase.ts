/**
 * Firebase compatibility shim backed by Supabase.
 *
 * This file exposes the exact same API surface as `firebase/auth` and
 * `firebase/firestore` so that the rest of the codebase keeps working
 * unchanged. Under the hood every call is routed to Supabase
 * (auth + Postgres + Realtime).
 *
 * Collection mapping:
 *   users                              -> public.profiles (id = auth user uid)
 *   users/{uid}/favorites              -> public.favorites (user_id=uid)
 *   users/{uid}/favorites/{prodId}     -> favorites row (user_id, product_id)
 *   users/{uid}/notifications          -> public.notifications (user_id=uid)
 *   users/{uid}/notifications/{id}     -> notifications row (id)
 *   products / products/{id}           -> public.products
 *   conversations / conversations/{id} -> public.conversations
 *   conversations/{cid}/messages       -> public.messages (conversation_id=cid)
 *   transactions                       -> public.transactions
 *   exchanges                          -> public.exchanges
 *   reviews                            -> public.reviews
 *   global_notifications               -> public.global_notifications
 *   appConfig / appConfig/{id}         -> public.app_config
 */

import { supabase } from '@/integrations/supabase/client';

// ===================== Public Firebase-like exports =====================

export const firebaseConfig = { projectId: 'trocshop-supabase' };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const msg = error?.message || String(error);
  // eslint-disable-next-line no-console
  console.warn(`[supabase:${operationType}] ${path ?? ''}: ${msg}`);
}

// ===================== Timestamp helper =====================

export type Timestamp = {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
  toMillis: () => number;
};

function tsFrom(value: any): Timestamp | any {
  if (value == null) return value;
  if (typeof value === 'object' && typeof (value as any).seconds === 'number') return value;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return value;
  const ms = d.getTime();
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: 0,
    toDate: () => new Date(ms),
    toMillis: () => ms,
  };
}

const SERVER_TS = '__SERVER_TIMESTAMP__';
export function serverTimestamp(): any {
  return SERVER_TS;
}

function resolveServerTs<T = any>(v: T): T {
  if (v === (SERVER_TS as any)) return new Date().toISOString() as any;
  return v;
}

function deepResolveServerTs(obj: any): any {
  if (obj == null) return obj;
  if (obj === SERVER_TS) return new Date().toISOString();
  if (isIncrement(obj)) return obj;
  if (Array.isArray(obj)) return obj.map(deepResolveServerTs);
  if (typeof obj === 'object') {
    const out: any = {};
    for (const k of Object.keys(obj)) out[k] = deepResolveServerTs(obj[k]);
    return out;
  }
  return obj;
}

// increment(n) sentinel — applied client-side at write time
const INCREMENT = Symbol('increment');
export function increment(n: number): any {
  return { [INCREMENT]: n };
}
function isIncrement(v: any): v is { [INCREMENT]: number } {
  return v && typeof v === 'object' && INCREMENT in v;
}

// ===================== Collection registry =====================

type Registry = {
  table: string;
  // map of camelCase JS field name -> snake_case DB column
  cols: Record<string, string>;
  // fields that are timestamps (we convert iso<->ts when reading)
  timestampFields: string[];
  // optional id type: 'uuid' (profiles) or 'text' (rest)
  idType?: 'uuid' | 'text';
  // composite key for subcollections (e.g. favorites stores user_id from path)
  // when path injects an extra equality filter on a DB col
  pathFilter?: { col: string; value: string }; // assigned by buildRef
  noDataCol?: boolean;
};

const COLLECTIONS: Record<string, Omit<Registry, 'pathFilter'>> = {
  profiles: {
    table: 'profiles',
    cols: { isPartener: 'is_partener', isPro: 'is_pro' },
    timestampFields: ['createdAt', 'updatedAt'],
    idType: 'uuid',
  },
  products: {
    table: 'products',
    cols: { sellerId: 'seller_id', status: 'status', createdAt: 'created_at', updatedAt: 'updated_at', likesCount: 'likesCount' },
    timestampFields: ['createdAt', 'updatedAt'],
  },
  conversations: {
    table: 'conversations',
    cols: { participantIds: 'participant_ids', createdAt: 'created_at', updatedAt: 'updated_at' },
    timestampFields: ['createdAt', 'updatedAt'],
  },
  messages: {
    table: 'messages',
    cols: { conversationId: 'conversation_id', senderId: 'sender_id', read: 'read', isRead: 'read', createdAt: 'created_at' },
    timestampFields: ['createdAt'],
  },
  transactions: {
    table: 'transactions',
    cols: {
      buyerId: 'buyer_id',
      sellerId: 'seller_id',
      participantIds: 'participant_ids',
      status: 'status',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    timestampFields: ['createdAt', 'updatedAt'],
  },
  exchanges: {
    table: 'exchanges',
    cols: { buyerId: 'buyer_id', sellerId: 'seller_id', status: 'status', createdAt: 'created_at', updatedAt: 'updated_at' },
    timestampFields: ['createdAt', 'updatedAt'],
  },
  reviews: {
    table: 'reviews',
    cols: {
      fromUserId: 'from_user_id',
      toUserId: 'to_user_id',
      toProductId: 'to_product_id',
      createdAt: 'created_at',
    },
    timestampFields: ['createdAt'],
  },
  favorites: {
    table: 'favorites',
    cols: { userId: 'user_id', productId: 'product_id', createdAt: 'created_at' },
    timestampFields: ['createdAt'],
  },
  notifications: {
    table: 'notifications',
    cols: { userId: 'user_id', toUserId: 'user_id', type: 'type', read: 'read', createdAt: 'created_at' },
    timestampFields: ['createdAt'],
  },
  global_notifications: {
    table: 'global_notifications',
    cols: { type: 'type', createdAt: 'created_at' },
    timestampFields: ['createdAt'],
  },
  app_config: {
    table: 'app_config',
    cols: { updatedAt: 'updated_at' },
    timestampFields: ['updatedAt'],
  },
  services: {
    table: 'services',
    cols: {
      sellerId: 'seller_id',
      status: 'status',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      serviceType: 'service_type',
      title: 'title',
      price: 'price',
      pricePeriod: 'price_period',
      neighborhood: 'neighborhood',
      customLocation: 'custom_location',
      description: 'description',
      images: 'images',
      sellerName: 'seller_name',
      sellerPhone: 'seller_phone',
    },
    timestampFields: ['createdAt', 'updatedAt'],
    noDataCol: true,
  },
};

// Path resolution: returns { registry, docId? }
type ResolvedPath = {
  registry: Registry;
  docId?: string;
  // For favorites we keep both user_id and product_id
  extraFilters?: Record<string, any>;
  // Original Firestore-style path segments
  segments: string[];
};

function resolvePath(segments: string[]): ResolvedPath {
  const [s0, s1, s2, s3] = segments;
  if (s0 === 'users') {
    if (segments.length === 1) {
      return { registry: { ...COLLECTIONS.profiles }, segments };
    }
    if (segments.length === 2) {
      return { registry: { ...COLLECTIONS.profiles }, docId: s1, segments };
    }
    if (s2 === 'favorites') {
      const reg: Registry = { ...COLLECTIONS.favorites, pathFilter: { col: 'user_id', value: s1 } };
      if (segments.length === 3) return { registry: reg, segments };
      // path: users/{uid}/favorites/{prodId} — docId is composite
      return { registry: reg, docId: s3, extraFilters: { user_id: s1, product_id: s3 }, segments };
    }
    if (s2 === 'notifications') {
      const reg: Registry = { ...COLLECTIONS.notifications, pathFilter: { col: 'user_id', value: s1 } };
      if (segments.length === 3) return { registry: reg, segments };
      return { registry: reg, docId: s3, segments };
    }
  }
  if (s0 === 'conversations') {
    if (segments.length === 1) return { registry: { ...COLLECTIONS.conversations }, segments };
    if (segments.length === 2) return { registry: { ...COLLECTIONS.conversations }, docId: s1, segments };
    if (s2 === 'messages') {
      const reg: Registry = { ...COLLECTIONS.messages, pathFilter: { col: 'conversation_id', value: s1 } };
      if (segments.length === 3) return { registry: reg, segments };
      return { registry: reg, docId: s3, segments };
    }
  }
  if (s0 === 'products') {
    if (segments.length === 1) return { registry: { ...COLLECTIONS.products }, segments };
    return { registry: { ...COLLECTIONS.products }, docId: s1, segments };
  }
  if (s0 === 'transactions') {
    if (segments.length === 1) return { registry: { ...COLLECTIONS.transactions }, segments };
    return { registry: { ...COLLECTIONS.transactions }, docId: s1, segments };
  }
  if (s0 === 'exchanges') {
    if (segments.length === 1) return { registry: { ...COLLECTIONS.exchanges }, segments };
    return { registry: { ...COLLECTIONS.exchanges }, docId: s1, segments };
  }
  if (s0 === 'reviews') {
    if (segments.length === 1) return { registry: { ...COLLECTIONS.reviews }, segments };
    return { registry: { ...COLLECTIONS.reviews }, docId: s1, segments };
  }
  if (s0 === 'global_notifications') {
    if (segments.length === 1) return { registry: { ...COLLECTIONS.global_notifications }, segments };
    return { registry: { ...COLLECTIONS.global_notifications }, docId: s1, segments };
  }
  if (s0 === 'appConfig' || s0 === 'app_config') {
    if (segments.length === 1) return { registry: { ...COLLECTIONS.app_config }, segments };
    return { registry: { ...COLLECTIONS.app_config }, docId: s1, segments };
  }
  if (s0 === 'services') {
    if (segments.length === 1) return { registry: { ...COLLECTIONS.services }, segments };
    return { registry: { ...COLLECTIONS.services }, docId: s1, segments };
  }
  throw new Error(`Unknown collection path: ${segments.join('/')}`);
}

// ===================== Row <-> Firestore doc mapping =====================

function rowToDoc(row: any, registry: Registry): any {
  if (!row) return row;
  const out: any = { ...(row.data ?? {}) };
  // copy indexed cols back as camelCase JS
  for (const [js, db] of Object.entries(registry.cols)) {
    if (db in row && row[db] !== undefined && row[db] !== null) {
      out[js] = row[db];
    }
  }
  // For favorites, id is product_id (no `id` column)
  if (registry.table === 'favorites') {
    out.id = row.product_id;
  } else if ('id' in row) {
    out.id = String(row.id);
  }
  // Support reading is_certified / isCertified columns in Supabase profiles table
  if (registry.table === 'profiles') {
    if ('is_certified' in row && row.is_certified !== undefined && row.is_certified !== null) {
      const val = row.is_certified === true || row.is_certified === 'vrai' || row.is_certified === 'true' || row.is_certified === 1;
      out.isCertified = val;
      out.is_certified = val;
      out['is certified'] = val;
    } else if ('isCertified' in row && row.isCertified !== undefined && row.isCertified !== null) {
      const val = row.isCertified === true || row.isCertified === 'vrai' || row.isCertified === 'true' || row.isCertified === 1;
      out.isCertified = val;
      out.is_certified = val;
      out['is certified'] = val;
    }

    // Support reading is_pro / isPro columns in Supabase profiles table
    if ('is_pro' in row && row.is_pro !== undefined && row.is_pro !== null) {
      const val = row.is_pro === true || row.is_pro === 'vrai' || row.is_pro === 'true' || row.is_pro === 1;
      out.isPro = val;
      out.is_pro = val;
    } else if ('isPro' in row && row.isPro !== undefined && row.isPro !== null) {
      const val = row.isPro === true || row.isPro === 'vrai' || row.isPro === 'true' || row.isPro === 1;
      out.isPro = val;
      out.is_pro = val;
    }
  }
  // Convert timestamp fields
  for (const tf of registry.timestampFields) {
    if (out[tf] != null) out[tf] = tsFrom(out[tf]);
  }
  return out;
}

function splitWritePayload(input: any, registry: Registry): { cols: Record<string, any>; data: Record<string, any> } {
  const cols: Record<string, any> = {};
  const data: Record<string, any> = {};
  const obj = deepResolveServerTs(input) ?? {};
  for (const key of Object.keys(obj)) {
    if (key === 'id') continue;
    const val = obj[key];
    if (registry.cols[key]) {
      cols[registry.cols[key]] = val;
      // Also keep in data for ease of read (especially createdAt for sorting)
      data[key] = val;
    } else {
      data[key] = val;
    }
  }
  return { cols, data };
}

// ===================== Doc / Collection references =====================

const TYPE = Symbol('refType');

export type DocRef = {
  [TYPE]: 'doc';
  segments: string[];
  resolved: ResolvedPath;
  id: string;
  path: string;
  parent: CollectionRef | null;
};

export type CollectionRef = {
  [TYPE]: 'collection';
  segments: string[];
  resolved: ResolvedPath;
  id: string;
  path: string;
};

function genId() {
  // RFC4122-ish
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function makeDocRef(segments: string[]): DocRef {
  const resolved = resolvePath(segments);
  const id = segments[segments.length - 1];
  return {
    [TYPE]: 'doc',
    segments,
    resolved,
    id,
    path: segments.join('/'),
    parent: makeCollectionRef(segments.slice(0, -1)),
  };
}

function makeCollectionRef(segments: string[]): CollectionRef {
  const resolved = resolvePath(segments);
  return {
    [TYPE]: 'collection',
    segments,
    resolved,
    id: segments[segments.length - 1],
    path: segments.join('/'),
  };
}

// ===================== Public API: doc / collection =====================

export const db = { __supabase: true } as any;

export function collection(parent: any, ...path: string[]): CollectionRef {
  if (parent && parent[TYPE] === 'doc') {
    return makeCollectionRef([...(parent as DocRef).segments, ...path]);
  }
  // parent is db (root)
  return makeCollectionRef(path);
}

export function doc(parent: any, ...path: string[]): DocRef {
  if (parent && parent[TYPE] === 'collection') {
    // doc(collectionRef) — auto-id, doc(collectionRef, id)
    if (path.length === 0) {
      const id = genId();
      return makeDocRef([...(parent as CollectionRef).segments, id]);
    }
    return makeDocRef([...(parent as CollectionRef).segments, ...path]);
  }
  if (parent && parent[TYPE] === 'doc') {
    return makeDocRef([...(parent as DocRef).segments, ...path]);
  }
  // parent is db (root)
  return makeDocRef(path);
}

// ===================== Reads =====================

export type DocSnapshot = {
  id: string;
  exists: () => boolean;
  data: () => any;
  ref: DocRef;
};

export type QuerySnapshot = {
  empty: boolean;
  size: number;
  docs: DocSnapshot[];
  forEach: (cb: (d: DocSnapshot) => void) => void;
  docChanges: () => any[];
};

async function fetchDoc(ref: DocRef): Promise<DocSnapshot> {
  const { registry, docId, extraFilters } = ref.resolved;
  let q = (supabase.from(registry.table) as any).select('*').limit(1);
  if (registry.table === 'favorites') {
    q = q.eq('user_id', extraFilters!.user_id).eq('product_id', extraFilters!.product_id);
  } else if (registry.table === 'notifications' && registry.pathFilter) {
    q = q.eq('id', docId).eq('user_id', registry.pathFilter.value);
  } else {
    q = q.eq('id', docId);
  }
  let data = null;
  let error = null;
  try {
    const res = await q.maybeSingle();
    data = res.data;
    error = res.error;
  } catch (err: any) {
    console.warn(`[fetchDoc] Network/fetch error for ${registry.table}/${docId}:`, err?.message || String(err));
  }
  if (error && error.code !== 'PGRST116') throw error;
  const doc = data ? rowToDoc(data, registry) : null;
  return {
    id: docId!,
    exists: () => !!doc,
    data: () => doc,
    ref,
  };
}

export async function getDoc(ref: DocRef): Promise<DocSnapshot> {
  return fetchDoc(ref);
}

// ===================== Query =====================

type Constraint =
  | { kind: 'where'; field: string; op: string; value: any }
  | { kind: 'orderBy'; field: string; dir: 'asc' | 'desc' }
  | { kind: 'limit'; n: number }
  | { kind: 'startAfter'; snap: any };

export type QueryRef = {
  __query: true;
  collection: CollectionRef;
  constraints: Constraint[];
};

export function where(field: string, op: string, value: any): Constraint {
  return { kind: 'where', field, op, value };
}
export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): Constraint {
  return { kind: 'orderBy', field, dir };
}
export function limit(n: number): Constraint {
  return { kind: 'limit', n };
}
export function startAfter(snap: any): Constraint {
  return { kind: 'startAfter', snap };
}

export function query(coll: CollectionRef | QueryRef, ...constraints: Constraint[]): QueryRef {
  const base: QueryRef =
    (coll as any).__query === true
      ? (coll as QueryRef)
      : { __query: true, collection: coll as CollectionRef, constraints: [] };
  return { ...base, constraints: [...base.constraints, ...constraints] };
}

function fieldToDbCol(field: string, registry: Registry): string {
  if (field === '__name__') return registry.table === 'favorites' ? 'product_id' : 'id';
  if (registry.cols[field]) return registry.cols[field];
  // Otherwise dig into JSONB data
  return `data->>${field}`;
}

function applyConstraints(supaQuery: any, qRef: QueryRef): any {
  const registry = qRef.collection.resolved.registry;
  let q = supaQuery;
  // Path-level filter (subcollections)
  if (registry.pathFilter) {
    q = q.eq(registry.pathFilter.col, registry.pathFilter.value);
  }

  for (const c of qRef.constraints) {
    if (c.kind === 'where') {
      const col = registry.cols[c.field] ?? (c.field === '__name__' ? (registry.table === 'favorites' ? 'product_id' : 'id') : null);
      if (col) {
        if (c.op === '==') q = q.eq(col, c.value);
        else if (c.op === '!=') q = q.neq(col, c.value);
        else if (c.op === '<') q = q.lt(col, c.value);
        else if (c.op === '<=') q = q.lte(col, c.value);
        else if (c.op === '>') q = q.gt(col, c.value);
        else if (c.op === '>=') q = q.gte(col, c.value);
        else if (c.op === 'in') q = q.in(col, c.value);
        else if (c.op === 'array-contains') q = q.contains(col, [c.value]);
        else if (c.op === 'array-contains-any') q = q.overlaps(col, c.value);
      } else {
        // JSONB field
        if (c.op === '==') q = q.eq(`data->>${c.field}`, c.value);
      }
    } else if (c.kind === 'orderBy') {
      const col = registry.cols[c.field] ?? `data->>${c.field}`;
      q = q.order(col, { ascending: c.dir === 'asc' });
    } else if (c.kind === 'limit') {
      q = q.limit(c.n);
    } else if (c.kind === 'startAfter') {
      // Not fully supported; ignored. Most code uses limit() only for pagination.
    }
  }
  return q;
}

export async function getDocs(refOrQuery: CollectionRef | QueryRef): Promise<QuerySnapshot> {
  const qRef: QueryRef =
    (refOrQuery as any).__query
      ? (refOrQuery as QueryRef)
      : { __query: true, collection: refOrQuery as CollectionRef, constraints: [] };
  const registry = qRef.collection.resolved.registry;
  let q = (supabase.from(registry.table) as any).select('*');
  q = applyConstraints(q, qRef);
  let data: any[] = [];
  let error = null;
  try {
    const res = await q;
    data = res.data ?? [];
    error = res.error;
  } catch (err: any) {
    console.warn(`[getDocs] Network/fetch error for collection ${registry.table}:`, err?.message || String(err));
  }
  if (error) throw error;
  const docs: DocSnapshot[] = data.map((row: any) => {
    const docId = registry.table === 'favorites' ? row.product_id : String(row.id);
    const docData = rowToDoc(row, registry);
    return {
      id: docId,
      exists: () => true,
      data: () => docData,
      ref: makeDocRef([...qRef.collection.segments, docId]),
    };
  });
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (cb) => docs.forEach(cb),
    docChanges: () => [],
  };
}

// ===================== Writes =====================

async function writeDoc(ref: DocRef, input: any, opts?: { merge?: boolean }): Promise<void> {
  const { registry } = ref.resolved;
  const { cols, data } = splitWritePayload(input, registry);
  const tableName = registry.table;

  if (tableName === 'favorites') {
    const payload: any = {
      user_id: ref.resolved.extraFilters!.user_id,
      product_id: ref.resolved.extraFilters!.product_id,
      data,
    };
    let error = null;
    try {
      const res = await (supabase.from(tableName) as any).upsert(payload, { onConflict: 'user_id,product_id' });
      error = res.error;
    } catch (err: any) {
      console.warn(`[writeDoc:favorites] Network/fetch error:`, err?.message || String(err));
      throw new Error("Erreur de connexion. Impossible de modifier vos favoris.");
    }
    if (error) throw error;
    return;
  }

  // Merge with existing data if needed
  let finalData = data;
  if (opts?.merge) {
    try {
      if (registry.noDataCol) {
        const { data: existing } = await (supabase.from(tableName) as any).select('*').eq('id', ref.id).maybeSingle();
        if (existing) {
          for (const [js, db] of Object.entries(registry.cols)) {
            if (existing[db] !== undefined && cols[db] === undefined) {
              cols[db] = existing[db];
            }
          }
        }
      } else {
        const { data: existing } = await (supabase.from(tableName) as any).select('data').eq('id', ref.id).maybeSingle();
        if (existing) finalData = { ...(existing.data ?? {}), ...data };
      }
    } catch (err: any) {
      console.warn(`[writeDoc:merge] Network/fetch error reading existing row for ${tableName}/${ref.id}:`, err?.message || String(err));
    }
  }

  const payload: any = {
    id: registry.idType === 'uuid' ? ref.id : ref.id,
    ...cols,
  };
  if (!registry.noDataCol) {
    payload.data = finalData;
  }

  // For notifications subcollection: user_id comes from the path
  if (tableName === 'notifications' && registry.pathFilter && !cols.user_id) {
    payload.user_id = registry.pathFilter.value;
  }
  // For messages subcollection: conversation_id comes from path
  if (tableName === 'messages' && registry.pathFilter && !cols.conversation_id) {
    payload.conversation_id = registry.pathFilter.value;
  }

  let error = null;
  try {
    const res = await (supabase.from(tableName) as any).upsert(payload, { onConflict: 'id' });
    error = res.error;
  } catch (err: any) {
    console.warn(`[writeDoc] Network/fetch error for ${tableName}:`, err?.message || String(err));
    throw new Error("Erreur de connexion. Veuillez vérifier votre connexion internet.");
  }
  if (error) throw error;
}

export async function setDoc(ref: DocRef, data: any, opts?: { merge?: boolean }): Promise<void> {
  return writeDoc(ref, data, opts);
}

export async function addDoc(coll: CollectionRef, data: any): Promise<DocRef> {
  const id = genId();
  const ref = makeDocRef([...coll.segments, id]);
  await writeDoc(ref, data);
  return ref;
}

export async function updateDoc(ref: DocRef, partial: any): Promise<void> {
  const { registry } = ref.resolved;
  const tableName = registry.table;
  const resolved = deepResolveServerTs(partial) ?? {};

  // Pre-fetch existing data for jsonb merge & for increments
  let existingRow: any = null;
  try {
    if (tableName === 'favorites') {
      const { data } = await (supabase.from(tableName) as any).select('*')
        .eq('user_id', ref.resolved.extraFilters!.user_id)
        .eq('product_id', ref.resolved.extraFilters!.product_id)
        .maybeSingle();
      existingRow = data;
    } else {
      let q = (supabase.from(tableName) as any).select('*').eq('id', ref.id);
      if (registry.pathFilter) q = q.eq(registry.pathFilter.col, registry.pathFilter.value);
      const { data } = await q.maybeSingle();
      existingRow = data;
    }
  } catch (err: any) {
    console.warn(`[updateDoc:prefetch] Network/fetch error pre-fetching ${tableName}/${ref.id}:`, err?.message || String(err));
  }

  const existingData = existingRow?.data ?? {};
  const newCols: Record<string, any> = {};
  const newData: Record<string, any> = { ...existingData };

  for (const key of Object.keys(resolved)) {
    let val = resolved[key];
    if (isIncrement(val)) {
      const rawCur = existingData[key] ?? existingRow?.[registry.cols[key]] ?? 0;
      const cur = Number(rawCur);
      val = (Number.isFinite(cur) ? cur : 0) + (val as any)[INCREMENT];
    }
    if (registry.cols[key]) {
      newCols[registry.cols[key]] = val;
    }
    // Handle dotted-path notation for nested field updates (e.g. "reactions.❤️")
    if (key.includes('.')) {
      const parts = key.split('.');
      let cur = newData;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!cur[part] || typeof cur[part] !== 'object' || Array.isArray(cur[part])) {
          cur[part] = {};
        }
        cur = cur[part];
      }
      cur[parts[parts.length - 1]] = val;
    } else {
      newData[key] = val;
    }
  }

  let error = null;
  try {
    if (tableName === 'favorites') {
      const updatePayload: any = { ...newCols };
      if (!registry.noDataCol) {
        updatePayload.data = newData;
      }
      const { error: err } = await (supabase.from(tableName) as any)
        .update(updatePayload)
        .eq('user_id', ref.resolved.extraFilters!.user_id)
        .eq('product_id', ref.resolved.extraFilters!.product_id);
      error = err;
    } else {
      const updatePayload: any = { ...newCols };
      if (!registry.noDataCol) {
        updatePayload.data = newData;
      }
      let q = (supabase.from(tableName) as any).update(updatePayload).eq('id', ref.id);
      if (registry.pathFilter) q = q.eq(registry.pathFilter.col, registry.pathFilter.value);
      const { error: err } = await q;
      error = err;
    }
  } catch (err: any) {
    console.warn(`[updateDoc] Network/fetch error updating ${tableName}/${ref.id}:`, err?.message || String(err));
    throw new Error("Erreur de connexion lors de la mise à jour.");
  }
  if (error) throw error;
}

export async function deleteDoc(ref: DocRef): Promise<void> {
  const { registry } = ref.resolved;
  const tableName = registry.table;
  let error = null;
  try {
    if (tableName === 'favorites') {
      const { error: err } = await (supabase.from(tableName) as any)
        .delete()
        .eq('user_id', ref.resolved.extraFilters!.user_id)
        .eq('product_id', ref.resolved.extraFilters!.product_id);
      error = err;
    } else {
      let q = (supabase.from(tableName) as any).delete().eq('id', ref.id);
      if (registry.pathFilter) q = q.eq(registry.pathFilter.col, registry.pathFilter.value);
      const { error: err } = await q;
      error = err;
    }
  } catch (err: any) {
    console.warn(`[deleteDoc] Network/fetch error deleting from ${tableName}/${ref.id}:`, err?.message || String(err));
    throw new Error("Erreur de connexion lors de la suppression.");
  }
  if (error) throw error;
}

// ===================== writeBatch =====================

type BatchOp =
  | { op: 'set'; ref: DocRef; data: any; opts?: { merge?: boolean } }
  | { op: 'update'; ref: DocRef; data: any }
  | { op: 'delete'; ref: DocRef };

export function writeBatch(_db: any) {
  const ops: BatchOp[] = [];
  return {
    set: (ref: DocRef, data: any, opts?: { merge?: boolean }) => {
      ops.push({ op: 'set', ref, data, opts });
    },
    update: (ref: DocRef, data: any) => {
      ops.push({ op: 'update', ref, data });
    },
    delete: (ref: DocRef) => {
      ops.push({ op: 'delete', ref });
    },
    commit: async () => {
      // Run sequentially to preserve order. Not atomic, but matches Firestore behavior closely enough.
      for (const o of ops) {
        try {
          if (o.op === 'set') await setDoc(o.ref, o.data, o.opts);
          else if (o.op === 'update') await updateDoc(o.ref, o.data);
          else await deleteDoc(o.ref);
        } catch (err: any) {
          const tableName = o.ref?.resolved?.registry?.table;
          const isRLSError = err?.message?.includes('row-level security') || err?.code === '42501' || String(err).includes('security policy');
          // If a user tries to write a notification or update a product for another user and hits Supabase RLS, suppress to allow core transaction to proceed
          if ((tableName === 'notifications' || tableName === 'products') && isRLSError) {
            console.warn(`[writeBatch] Suppressed ${tableName} RLS restriction:`, err);
          } else {
            throw err;
          }
        }
      }
    },
  };
}

// ===================== onSnapshot =====================

type Unsubscribe = () => void;

export function onSnapshot(
  refOrQuery: DocRef | CollectionRef | QueryRef,
  onNext: (snap: any) => void,
  onError?: (e: any) => void,
): Unsubscribe {
  const isDoc = (refOrQuery as any)[TYPE] === 'doc';
  const isQuery = (refOrQuery as any).__query === true;
  let cancelled = false;

  let lastDocsMap: Map<string, any> = new Map();
  let firstEmit = true;

  const refresh = async () => {
    try {
      if (cancelled) return;
      if (isDoc) {
        const snap = await fetchDoc(refOrQuery as DocRef);
        if (!cancelled) onNext(snap);
      } else {
        const snap = await getDocs(refOrQuery as CollectionRef | QueryRef);
        if (cancelled) return;

        const changes: any[] = [];
        const currentDocsMap = new Map<string, any>();

        snap.docs.forEach((doc) => {
          const docId = doc.id;
          const docData = doc.data();
          currentDocsMap.set(docId, docData);

          if (firstEmit) {
            changes.push({
              type: 'added',
              doc,
            });
          } else {
            if (!lastDocsMap.has(docId)) {
              changes.push({
                type: 'added',
                doc,
              });
            } else {
              const oldData = lastDocsMap.get(docId);
              // Compare simple string representation for modifications
              if (JSON.stringify(oldData) !== JSON.stringify(docData)) {
                changes.push({
                  type: 'modified',
                  doc,
                });
              }
            }
          }
        });

        if (!firstEmit) {
          lastDocsMap.forEach((oldData, docId) => {
            if (!currentDocsMap.has(docId)) {
              changes.push({
                type: 'removed',
                doc: { id: docId, data: () => oldData, exists: () => false },
              });
            }
          });
        }

        firstEmit = false;
        lastDocsMap = currentDocsMap;

        // Augment QuerySnapshot with the actual diffs
        snap.docChanges = () => changes;

        onNext(snap);
      }
    } catch (e) {
      if (onError) onError(e);
      else handleFirestoreError(e, OperationType.GET, null);
    }
  };

  // Initial fetch
  refresh();

  // Determine which table to subscribe to
  let registry: Registry;
  if (isDoc) registry = (refOrQuery as DocRef).resolved.registry;
  else if (isQuery) registry = (refOrQuery as QueryRef).collection.resolved.registry;
  else registry = (refOrQuery as CollectionRef).resolved.registry;

  const channelName = `rt-${registry.table}-${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: registry.table },
      () => {
        refresh();
      },
    )
    .subscribe();

  return () => {
    cancelled = true;
    try {
      supabase.removeChannel(channel);
    } catch {}
  };
}

// ===================== AUTH =====================

export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerData: any[];
  emailVerified: boolean;
  isAnonymous: boolean;
  tenantId: null;
};

let _currentUser: User | null = null;
const _authListeners: Set<(u: User | null) => void> = new Set();

function makeUser(supaUser: any): User | null {
  if (!supaUser) return null;
  const meta = supaUser.user_metadata ?? {};
  return {
    uid: supaUser.id,
    email: supaUser.email ?? null,
    displayName: meta.displayName ?? meta.full_name ?? null,
    photoURL: meta.photoURL ?? meta.avatar_url ?? null,
    providerData: [],
    emailVerified: !!supaUser.email_confirmed_at,
    isAnonymous: false,
    tenantId: null,
  };
}

// Bootstrap session
supabase.auth.getSession()
  .then(({ data }) => {
    _currentUser = makeUser(data.session?.user ?? null);
    _authListeners.forEach((cb) => cb(_currentUser));
  })
  .catch((err) => {
    console.warn("[supabase] Failed to fetch session. The user is offline or Supabase is paused:", err?.message || String(err));
    _currentUser = null;
    _authListeners.forEach((cb) => cb(null));
  });

supabase.auth.onAuthStateChange((_event, session) => {
  _currentUser = makeUser(session?.user ?? null);
  _authListeners.forEach((cb) => cb(_currentUser));
});

export const auth = {
  get currentUser(): User | null {
    return _currentUser;
  },
};

export function onAuthStateChanged(_auth: any, cb: (u: User | null) => void): Unsubscribe {
  _authListeners.add(cb);
  // Fire immediately with current state
  Promise.resolve().then(() => cb(_currentUser));
  return () => {
    _authListeners.delete(cb);
  };
}

export async function signInWithEmailAndPassword(_auth: any, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const err: any = new Error(error.message);
    if (/invalid login/i.test(error.message) || /credentials/i.test(error.message)) {
      err.code = 'auth/invalid-credential';
    } else {
      err.code = 'auth/unknown';
    }
    throw err;
  }
  return { user: makeUser(data.user) };
}

export async function createUserWithEmailAndPassword(_auth: any, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
  });
  if (error) {
    const err: any = new Error(error.message);
    if (/registered/i.test(error.message)) err.code = 'auth/email-already-in-use';
    else err.code = 'auth/unknown';
    throw err;
  }
  return { user: makeUser(data.user) };
}

export async function updateProfile(_user: any, profile: { displayName?: string; photoURL?: string }) {
  const { error } = await supabase.auth.updateUser({ data: profile });
  if (error) throw error;

  if (_user?.uid) {
    const { data: existing } = await supabase.from('profiles').select('data').eq('id', _user.uid).maybeSingle();
    const existingData = existing?.data ?? {};
    const newData = {
      ...existingData,
      uid: _user.uid,
      displayName: profile.displayName || existingData.displayName || '',
      photoURL: profile.photoURL || existingData.photoURL || '',
    };
    await supabase.from('profiles').upsert({
      id: _user.uid,
      data: newData
    }, { onConflict: 'id' });
  }
}

export async function signOut(_auth: any) {
  await supabase.auth.signOut();
}

// Stubs for Google sign-in (kept so existing imports compile; not used)
export class GoogleAuthProvider {
  static credentialFromResult(_r: any) {
    return null;
  }
  addScope(_s: string) {}
  setCustomParameters(_p: any) {}
}
export async function signInWithPopup(_auth: any, _provider: any): Promise<any> {
  throw new Error("Google sign-in n'est pas configuré dans cette version.");
}
export async function signInWithRedirect(_auth: any, _provider: any): Promise<void> {
  throw new Error("Google sign-in n'est pas configuré dans cette version.");
}
export async function getRedirectResult(_auth: any): Promise<null> {
  return null;
}

// ===================== Storage helper =====================

export async function uploadToSupabaseStorage(
  bucket: 'product-images' | 'avatars' | 'chat-media',
  base64OrUrl: string,
  ext = 'jpg',
): Promise<string> {
  if (!base64OrUrl) return base64OrUrl;
  if (!base64OrUrl.startsWith('data:')) return base64OrUrl;

  const uid = _currentUser?.uid ?? 'anon';
  const commaIndex = base64OrUrl.indexOf(',');
  if (commaIndex === -1) throw new Error('Format base64 invalide');
  const header = base64OrUrl.substring(0, commaIndex);
  if (!header.startsWith('data:') || !header.includes(';base64')) {
    throw new Error('Format base64 invalide');
  }
  const mimeMatch = header.match(/^data:([^;]+)/);
  if (!mimeMatch) throw new Error('Format base64 invalide');
  const mime = mimeMatch[1];
  const b64 = base64OrUrl.substring(commaIndex + 1);
  const guessedExt = mime.split('/')[1]?.split('+')[0] || ext;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${guessedExt}`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    if (bucket === 'chat-media') {
      console.warn("chat-media bucket failed, falling back to product-images:", error);
      const { error: fbError } = await supabase.storage.from('product-images').upload(path, bytes, {
        contentType: mime,
        upsert: false,
      });
      if (fbError) throw fbError;
      const { data: fbData } = supabase.storage.from('product-images').getPublicUrl(path);
      return fbData.publicUrl;
    }
    throw error;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
