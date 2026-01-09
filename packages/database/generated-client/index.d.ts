
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model AgencyProfile
 * 
 */
export type AgencyProfile = $Result.DefaultSelection<Prisma.$AgencyProfilePayload>
/**
 * Model TripTemplate
 * 
 */
export type TripTemplate = $Result.DefaultSelection<Prisma.$TripTemplatePayload>
/**
 * Model ItineraryDay
 * 
 */
export type ItineraryDay = $Result.DefaultSelection<Prisma.$ItineraryDayPayload>
/**
 * Model TripSession
 * 
 */
export type TripSession = $Result.DefaultSelection<Prisma.$TripSessionPayload>
/**
 * Model Booking
 * 
 */
export type Booking = $Result.DefaultSelection<Prisma.$BookingPayload>
/**
 * Model PaymentProof
 * 
 */
export type PaymentProof = $Result.DefaultSelection<Prisma.$PaymentProofPayload>
/**
 * Model Wallet
 * 
 */
export type Wallet = $Result.DefaultSelection<Prisma.$WalletPayload>
/**
 * Model WalletTransaction
 * 
 */
export type WalletTransaction = $Result.DefaultSelection<Prisma.$WalletTransactionPayload>
/**
 * Model PayoutRequest
 * 
 */
export type PayoutRequest = $Result.DefaultSelection<Prisma.$PayoutRequestPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const UserRole: {
  AGENCY: 'AGENCY',
  TRAVELER: 'TRAVELER',
  ADMIN: 'ADMIN'
};

export type UserRole = (typeof UserRole)[keyof typeof UserRole]


export const VerificationStatus: {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus]


export const SubscriptionStatus: {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]


export const TripCategory: {
  ADVENTURE: 'ADVENTURE',
  CULTURAL: 'CULTURAL',
  LUXURY: 'LUXURY',
  BUDGET: 'BUDGET'
};

export type TripCategory = (typeof TripCategory)[keyof typeof TripCategory]


export const TripStatus: {
  ACTIVE: 'ACTIVE',
  DRAFT: 'DRAFT',
  ARCHIVED: 'ARCHIVED'
};

export type TripStatus = (typeof TripStatus)[keyof typeof TripStatus]


export const BookingStatus: {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  PENDING_PAYMENT: 'PENDING_PAYMENT'
};

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus]


export const TransactionType: {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT'
};

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]


export const PayoutStatus: {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAID: 'PAID'
};

export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus]

}

export type UserRole = $Enums.UserRole

export const UserRole: typeof $Enums.UserRole

export type VerificationStatus = $Enums.VerificationStatus

export const VerificationStatus: typeof $Enums.VerificationStatus

export type SubscriptionStatus = $Enums.SubscriptionStatus

export const SubscriptionStatus: typeof $Enums.SubscriptionStatus

export type TripCategory = $Enums.TripCategory

export const TripCategory: typeof $Enums.TripCategory

export type TripStatus = $Enums.TripStatus

export const TripStatus: typeof $Enums.TripStatus

export type BookingStatus = $Enums.BookingStatus

export const BookingStatus: typeof $Enums.BookingStatus

export type TransactionType = $Enums.TransactionType

export const TransactionType: typeof $Enums.TransactionType

export type PayoutStatus = $Enums.PayoutStatus

export const PayoutStatus: typeof $Enums.PayoutStatus

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs>;

  /**
   * `prisma.agencyProfile`: Exposes CRUD operations for the **AgencyProfile** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AgencyProfiles
    * const agencyProfiles = await prisma.agencyProfile.findMany()
    * ```
    */
  get agencyProfile(): Prisma.AgencyProfileDelegate<ExtArgs>;

  /**
   * `prisma.tripTemplate`: Exposes CRUD operations for the **TripTemplate** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TripTemplates
    * const tripTemplates = await prisma.tripTemplate.findMany()
    * ```
    */
  get tripTemplate(): Prisma.TripTemplateDelegate<ExtArgs>;

  /**
   * `prisma.itineraryDay`: Exposes CRUD operations for the **ItineraryDay** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ItineraryDays
    * const itineraryDays = await prisma.itineraryDay.findMany()
    * ```
    */
  get itineraryDay(): Prisma.ItineraryDayDelegate<ExtArgs>;

  /**
   * `prisma.tripSession`: Exposes CRUD operations for the **TripSession** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TripSessions
    * const tripSessions = await prisma.tripSession.findMany()
    * ```
    */
  get tripSession(): Prisma.TripSessionDelegate<ExtArgs>;

  /**
   * `prisma.booking`: Exposes CRUD operations for the **Booking** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Bookings
    * const bookings = await prisma.booking.findMany()
    * ```
    */
  get booking(): Prisma.BookingDelegate<ExtArgs>;

  /**
   * `prisma.paymentProof`: Exposes CRUD operations for the **PaymentProof** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PaymentProofs
    * const paymentProofs = await prisma.paymentProof.findMany()
    * ```
    */
  get paymentProof(): Prisma.PaymentProofDelegate<ExtArgs>;

  /**
   * `prisma.wallet`: Exposes CRUD operations for the **Wallet** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Wallets
    * const wallets = await prisma.wallet.findMany()
    * ```
    */
  get wallet(): Prisma.WalletDelegate<ExtArgs>;

  /**
   * `prisma.walletTransaction`: Exposes CRUD operations for the **WalletTransaction** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more WalletTransactions
    * const walletTransactions = await prisma.walletTransaction.findMany()
    * ```
    */
  get walletTransaction(): Prisma.WalletTransactionDelegate<ExtArgs>;

  /**
   * `prisma.payoutRequest`: Exposes CRUD operations for the **PayoutRequest** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PayoutRequests
    * const payoutRequests = await prisma.payoutRequest.findMany()
    * ```
    */
  get payoutRequest(): Prisma.PayoutRequestDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    AgencyProfile: 'AgencyProfile',
    TripTemplate: 'TripTemplate',
    ItineraryDay: 'ItineraryDay',
    TripSession: 'TripSession',
    Booking: 'Booking',
    PaymentProof: 'PaymentProof',
    Wallet: 'Wallet',
    WalletTransaction: 'WalletTransaction',
    PayoutRequest: 'PayoutRequest'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "user" | "agencyProfile" | "tripTemplate" | "itineraryDay" | "tripSession" | "booking" | "paymentProof" | "wallet" | "walletTransaction" | "payoutRequest"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      AgencyProfile: {
        payload: Prisma.$AgencyProfilePayload<ExtArgs>
        fields: Prisma.AgencyProfileFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AgencyProfileFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgencyProfilePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AgencyProfileFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgencyProfilePayload>
          }
          findFirst: {
            args: Prisma.AgencyProfileFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgencyProfilePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AgencyProfileFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgencyProfilePayload>
          }
          findMany: {
            args: Prisma.AgencyProfileFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgencyProfilePayload>[]
          }
          create: {
            args: Prisma.AgencyProfileCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgencyProfilePayload>
          }
          createMany: {
            args: Prisma.AgencyProfileCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AgencyProfileCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgencyProfilePayload>[]
          }
          delete: {
            args: Prisma.AgencyProfileDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgencyProfilePayload>
          }
          update: {
            args: Prisma.AgencyProfileUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgencyProfilePayload>
          }
          deleteMany: {
            args: Prisma.AgencyProfileDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AgencyProfileUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.AgencyProfileUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgencyProfilePayload>
          }
          aggregate: {
            args: Prisma.AgencyProfileAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAgencyProfile>
          }
          groupBy: {
            args: Prisma.AgencyProfileGroupByArgs<ExtArgs>
            result: $Utils.Optional<AgencyProfileGroupByOutputType>[]
          }
          count: {
            args: Prisma.AgencyProfileCountArgs<ExtArgs>
            result: $Utils.Optional<AgencyProfileCountAggregateOutputType> | number
          }
        }
      }
      TripTemplate: {
        payload: Prisma.$TripTemplatePayload<ExtArgs>
        fields: Prisma.TripTemplateFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TripTemplateFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripTemplatePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TripTemplateFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripTemplatePayload>
          }
          findFirst: {
            args: Prisma.TripTemplateFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripTemplatePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TripTemplateFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripTemplatePayload>
          }
          findMany: {
            args: Prisma.TripTemplateFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripTemplatePayload>[]
          }
          create: {
            args: Prisma.TripTemplateCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripTemplatePayload>
          }
          createMany: {
            args: Prisma.TripTemplateCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TripTemplateCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripTemplatePayload>[]
          }
          delete: {
            args: Prisma.TripTemplateDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripTemplatePayload>
          }
          update: {
            args: Prisma.TripTemplateUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripTemplatePayload>
          }
          deleteMany: {
            args: Prisma.TripTemplateDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TripTemplateUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.TripTemplateUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripTemplatePayload>
          }
          aggregate: {
            args: Prisma.TripTemplateAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTripTemplate>
          }
          groupBy: {
            args: Prisma.TripTemplateGroupByArgs<ExtArgs>
            result: $Utils.Optional<TripTemplateGroupByOutputType>[]
          }
          count: {
            args: Prisma.TripTemplateCountArgs<ExtArgs>
            result: $Utils.Optional<TripTemplateCountAggregateOutputType> | number
          }
        }
      }
      ItineraryDay: {
        payload: Prisma.$ItineraryDayPayload<ExtArgs>
        fields: Prisma.ItineraryDayFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ItineraryDayFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItineraryDayPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ItineraryDayFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItineraryDayPayload>
          }
          findFirst: {
            args: Prisma.ItineraryDayFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItineraryDayPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ItineraryDayFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItineraryDayPayload>
          }
          findMany: {
            args: Prisma.ItineraryDayFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItineraryDayPayload>[]
          }
          create: {
            args: Prisma.ItineraryDayCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItineraryDayPayload>
          }
          createMany: {
            args: Prisma.ItineraryDayCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ItineraryDayCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItineraryDayPayload>[]
          }
          delete: {
            args: Prisma.ItineraryDayDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItineraryDayPayload>
          }
          update: {
            args: Prisma.ItineraryDayUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItineraryDayPayload>
          }
          deleteMany: {
            args: Prisma.ItineraryDayDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ItineraryDayUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ItineraryDayUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ItineraryDayPayload>
          }
          aggregate: {
            args: Prisma.ItineraryDayAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateItineraryDay>
          }
          groupBy: {
            args: Prisma.ItineraryDayGroupByArgs<ExtArgs>
            result: $Utils.Optional<ItineraryDayGroupByOutputType>[]
          }
          count: {
            args: Prisma.ItineraryDayCountArgs<ExtArgs>
            result: $Utils.Optional<ItineraryDayCountAggregateOutputType> | number
          }
        }
      }
      TripSession: {
        payload: Prisma.$TripSessionPayload<ExtArgs>
        fields: Prisma.TripSessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TripSessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripSessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TripSessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripSessionPayload>
          }
          findFirst: {
            args: Prisma.TripSessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripSessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TripSessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripSessionPayload>
          }
          findMany: {
            args: Prisma.TripSessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripSessionPayload>[]
          }
          create: {
            args: Prisma.TripSessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripSessionPayload>
          }
          createMany: {
            args: Prisma.TripSessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.TripSessionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripSessionPayload>[]
          }
          delete: {
            args: Prisma.TripSessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripSessionPayload>
          }
          update: {
            args: Prisma.TripSessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripSessionPayload>
          }
          deleteMany: {
            args: Prisma.TripSessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TripSessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.TripSessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TripSessionPayload>
          }
          aggregate: {
            args: Prisma.TripSessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTripSession>
          }
          groupBy: {
            args: Prisma.TripSessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<TripSessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.TripSessionCountArgs<ExtArgs>
            result: $Utils.Optional<TripSessionCountAggregateOutputType> | number
          }
        }
      }
      Booking: {
        payload: Prisma.$BookingPayload<ExtArgs>
        fields: Prisma.BookingFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BookingFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookingPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BookingFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookingPayload>
          }
          findFirst: {
            args: Prisma.BookingFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookingPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BookingFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookingPayload>
          }
          findMany: {
            args: Prisma.BookingFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookingPayload>[]
          }
          create: {
            args: Prisma.BookingCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookingPayload>
          }
          createMany: {
            args: Prisma.BookingCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.BookingCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookingPayload>[]
          }
          delete: {
            args: Prisma.BookingDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookingPayload>
          }
          update: {
            args: Prisma.BookingUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookingPayload>
          }
          deleteMany: {
            args: Prisma.BookingDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.BookingUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.BookingUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookingPayload>
          }
          aggregate: {
            args: Prisma.BookingAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBooking>
          }
          groupBy: {
            args: Prisma.BookingGroupByArgs<ExtArgs>
            result: $Utils.Optional<BookingGroupByOutputType>[]
          }
          count: {
            args: Prisma.BookingCountArgs<ExtArgs>
            result: $Utils.Optional<BookingCountAggregateOutputType> | number
          }
        }
      }
      PaymentProof: {
        payload: Prisma.$PaymentProofPayload<ExtArgs>
        fields: Prisma.PaymentProofFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PaymentProofFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentProofPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PaymentProofFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentProofPayload>
          }
          findFirst: {
            args: Prisma.PaymentProofFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentProofPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PaymentProofFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentProofPayload>
          }
          findMany: {
            args: Prisma.PaymentProofFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentProofPayload>[]
          }
          create: {
            args: Prisma.PaymentProofCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentProofPayload>
          }
          createMany: {
            args: Prisma.PaymentProofCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PaymentProofCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentProofPayload>[]
          }
          delete: {
            args: Prisma.PaymentProofDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentProofPayload>
          }
          update: {
            args: Prisma.PaymentProofUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentProofPayload>
          }
          deleteMany: {
            args: Prisma.PaymentProofDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PaymentProofUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.PaymentProofUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PaymentProofPayload>
          }
          aggregate: {
            args: Prisma.PaymentProofAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePaymentProof>
          }
          groupBy: {
            args: Prisma.PaymentProofGroupByArgs<ExtArgs>
            result: $Utils.Optional<PaymentProofGroupByOutputType>[]
          }
          count: {
            args: Prisma.PaymentProofCountArgs<ExtArgs>
            result: $Utils.Optional<PaymentProofCountAggregateOutputType> | number
          }
        }
      }
      Wallet: {
        payload: Prisma.$WalletPayload<ExtArgs>
        fields: Prisma.WalletFieldRefs
        operations: {
          findUnique: {
            args: Prisma.WalletFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.WalletFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>
          }
          findFirst: {
            args: Prisma.WalletFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.WalletFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>
          }
          findMany: {
            args: Prisma.WalletFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>[]
          }
          create: {
            args: Prisma.WalletCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>
          }
          createMany: {
            args: Prisma.WalletCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.WalletCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>[]
          }
          delete: {
            args: Prisma.WalletDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>
          }
          update: {
            args: Prisma.WalletUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>
          }
          deleteMany: {
            args: Prisma.WalletDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.WalletUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.WalletUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletPayload>
          }
          aggregate: {
            args: Prisma.WalletAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWallet>
          }
          groupBy: {
            args: Prisma.WalletGroupByArgs<ExtArgs>
            result: $Utils.Optional<WalletGroupByOutputType>[]
          }
          count: {
            args: Prisma.WalletCountArgs<ExtArgs>
            result: $Utils.Optional<WalletCountAggregateOutputType> | number
          }
        }
      }
      WalletTransaction: {
        payload: Prisma.$WalletTransactionPayload<ExtArgs>
        fields: Prisma.WalletTransactionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.WalletTransactionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletTransactionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.WalletTransactionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletTransactionPayload>
          }
          findFirst: {
            args: Prisma.WalletTransactionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletTransactionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.WalletTransactionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletTransactionPayload>
          }
          findMany: {
            args: Prisma.WalletTransactionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletTransactionPayload>[]
          }
          create: {
            args: Prisma.WalletTransactionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletTransactionPayload>
          }
          createMany: {
            args: Prisma.WalletTransactionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.WalletTransactionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletTransactionPayload>[]
          }
          delete: {
            args: Prisma.WalletTransactionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletTransactionPayload>
          }
          update: {
            args: Prisma.WalletTransactionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletTransactionPayload>
          }
          deleteMany: {
            args: Prisma.WalletTransactionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.WalletTransactionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.WalletTransactionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$WalletTransactionPayload>
          }
          aggregate: {
            args: Prisma.WalletTransactionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateWalletTransaction>
          }
          groupBy: {
            args: Prisma.WalletTransactionGroupByArgs<ExtArgs>
            result: $Utils.Optional<WalletTransactionGroupByOutputType>[]
          }
          count: {
            args: Prisma.WalletTransactionCountArgs<ExtArgs>
            result: $Utils.Optional<WalletTransactionCountAggregateOutputType> | number
          }
        }
      }
      PayoutRequest: {
        payload: Prisma.$PayoutRequestPayload<ExtArgs>
        fields: Prisma.PayoutRequestFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PayoutRequestFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PayoutRequestPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PayoutRequestFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PayoutRequestPayload>
          }
          findFirst: {
            args: Prisma.PayoutRequestFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PayoutRequestPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PayoutRequestFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PayoutRequestPayload>
          }
          findMany: {
            args: Prisma.PayoutRequestFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PayoutRequestPayload>[]
          }
          create: {
            args: Prisma.PayoutRequestCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PayoutRequestPayload>
          }
          createMany: {
            args: Prisma.PayoutRequestCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.PayoutRequestCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PayoutRequestPayload>[]
          }
          delete: {
            args: Prisma.PayoutRequestDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PayoutRequestPayload>
          }
          update: {
            args: Prisma.PayoutRequestUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PayoutRequestPayload>
          }
          deleteMany: {
            args: Prisma.PayoutRequestDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PayoutRequestUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.PayoutRequestUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PayoutRequestPayload>
          }
          aggregate: {
            args: Prisma.PayoutRequestAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePayoutRequest>
          }
          groupBy: {
            args: Prisma.PayoutRequestGroupByArgs<ExtArgs>
            result: $Utils.Optional<PayoutRequestGroupByOutputType>[]
          }
          count: {
            args: Prisma.PayoutRequestCountArgs<ExtArgs>
            result: $Utils.Optional<PayoutRequestCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    bookings: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    bookings?: boolean | UserCountOutputTypeCountBookingsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountBookingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BookingWhereInput
  }


  /**
   * Count Type AgencyProfileCountOutputType
   */

  export type AgencyProfileCountOutputType = {
    templates: number
    payoutRequests: number
  }

  export type AgencyProfileCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    templates?: boolean | AgencyProfileCountOutputTypeCountTemplatesArgs
    payoutRequests?: boolean | AgencyProfileCountOutputTypeCountPayoutRequestsArgs
  }

  // Custom InputTypes
  /**
   * AgencyProfileCountOutputType without action
   */
  export type AgencyProfileCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgencyProfileCountOutputType
     */
    select?: AgencyProfileCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AgencyProfileCountOutputType without action
   */
  export type AgencyProfileCountOutputTypeCountTemplatesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TripTemplateWhereInput
  }

  /**
   * AgencyProfileCountOutputType without action
   */
  export type AgencyProfileCountOutputTypeCountPayoutRequestsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PayoutRequestWhereInput
  }


  /**
   * Count Type TripTemplateCountOutputType
   */

  export type TripTemplateCountOutputType = {
    sessions: number
    itinerary: number
  }

  export type TripTemplateCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    sessions?: boolean | TripTemplateCountOutputTypeCountSessionsArgs
    itinerary?: boolean | TripTemplateCountOutputTypeCountItineraryArgs
  }

  // Custom InputTypes
  /**
   * TripTemplateCountOutputType without action
   */
  export type TripTemplateCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripTemplateCountOutputType
     */
    select?: TripTemplateCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * TripTemplateCountOutputType without action
   */
  export type TripTemplateCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TripSessionWhereInput
  }

  /**
   * TripTemplateCountOutputType without action
   */
  export type TripTemplateCountOutputTypeCountItineraryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ItineraryDayWhereInput
  }


  /**
   * Count Type TripSessionCountOutputType
   */

  export type TripSessionCountOutputType = {
    bookings: number
  }

  export type TripSessionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    bookings?: boolean | TripSessionCountOutputTypeCountBookingsArgs
  }

  // Custom InputTypes
  /**
   * TripSessionCountOutputType without action
   */
  export type TripSessionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripSessionCountOutputType
     */
    select?: TripSessionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * TripSessionCountOutputType without action
   */
  export type TripSessionCountOutputTypeCountBookingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BookingWhereInput
  }


  /**
   * Count Type WalletCountOutputType
   */

  export type WalletCountOutputType = {
    transactions: number
  }

  export type WalletCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    transactions?: boolean | WalletCountOutputTypeCountTransactionsArgs
  }

  // Custom InputTypes
  /**
   * WalletCountOutputType without action
   */
  export type WalletCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WalletCountOutputType
     */
    select?: WalletCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * WalletCountOutputType without action
   */
  export type WalletCountOutputTypeCountTransactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WalletTransactionWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    password: string | null
    role: $Enums.UserRole | null
    avatar: string | null
    isEmailVerified: boolean | null
    otp: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    name: string | null
    email: string | null
    password: string | null
    role: $Enums.UserRole | null
    avatar: string | null
    isEmailVerified: boolean | null
    otp: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    name: number
    email: number
    password: number
    role: number
    avatar: number
    isEmailVerified: number
    otp: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    name?: true
    email?: true
    password?: true
    role?: true
    avatar?: true
    isEmailVerified?: true
    otp?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    name?: true
    email?: true
    password?: true
    role?: true
    avatar?: true
    isEmailVerified?: true
    otp?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    name?: true
    email?: true
    password?: true
    role?: true
    avatar?: true
    isEmailVerified?: true
    otp?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    name: string | null
    email: string
    password: string
    role: $Enums.UserRole
    avatar: string | null
    isEmailVerified: boolean
    otp: string | null
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    password?: boolean
    role?: boolean
    avatar?: boolean
    isEmailVerified?: boolean
    otp?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    agencyProfile?: boolean | User$agencyProfileArgs<ExtArgs>
    bookings?: boolean | User$bookingsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    password?: boolean
    role?: boolean
    avatar?: boolean
    isEmailVerified?: boolean
    otp?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    name?: boolean
    email?: boolean
    password?: boolean
    role?: boolean
    avatar?: boolean
    isEmailVerified?: boolean
    otp?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agencyProfile?: boolean | User$agencyProfileArgs<ExtArgs>
    bookings?: boolean | User$bookingsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      agencyProfile: Prisma.$AgencyProfilePayload<ExtArgs> | null
      bookings: Prisma.$BookingPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string | null
      email: string
      password: string
      role: $Enums.UserRole
      avatar: string | null
      isEmailVerified: boolean
      otp: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    agencyProfile<T extends User$agencyProfileArgs<ExtArgs> = {}>(args?: Subset<T, User$agencyProfileArgs<ExtArgs>>): Prisma__AgencyProfileClient<$Result.GetResult<Prisma.$AgencyProfilePayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    bookings<T extends User$bookingsArgs<ExtArgs> = {}>(args?: Subset<T, User$bookingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BookingPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */ 
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly name: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly password: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'UserRole'>
    readonly avatar: FieldRef<"User", 'String'>
    readonly isEmailVerified: FieldRef<"User", 'Boolean'>
    readonly otp: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
  }

  /**
   * User.agencyProfile
   */
  export type User$agencyProfileArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgencyProfile
     */
    select?: AgencyProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgencyProfileInclude<ExtArgs> | null
    where?: AgencyProfileWhereInput
  }

  /**
   * User.bookings
   */
  export type User$bookingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Booking
     */
    select?: BookingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookingInclude<ExtArgs> | null
    where?: BookingWhereInput
    orderBy?: BookingOrderByWithRelationInput | BookingOrderByWithRelationInput[]
    cursor?: BookingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: BookingScalarFieldEnum | BookingScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model AgencyProfile
   */

  export type AggregateAgencyProfile = {
    _count: AgencyProfileCountAggregateOutputType | null
    _min: AgencyProfileMinAggregateOutputType | null
    _max: AgencyProfileMaxAggregateOutputType | null
  }

  export type AgencyProfileMinAggregateOutputType = {
    id: string | null
    userId: string | null
    companyName: string | null
    ice: string | null
    patente: string | null
    rib: string | null
    verificationStatus: $Enums.VerificationStatus | null
    bio: string | null
    logo: string | null
    subscriptionStatus: $Enums.SubscriptionStatus | null
    trialEndsAt: Date | null
    subscriptionEndsAt: Date | null
  }

  export type AgencyProfileMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    companyName: string | null
    ice: string | null
    patente: string | null
    rib: string | null
    verificationStatus: $Enums.VerificationStatus | null
    bio: string | null
    logo: string | null
    subscriptionStatus: $Enums.SubscriptionStatus | null
    trialEndsAt: Date | null
    subscriptionEndsAt: Date | null
  }

  export type AgencyProfileCountAggregateOutputType = {
    id: number
    userId: number
    companyName: number
    ice: number
    patente: number
    rib: number
    verificationStatus: number
    bio: number
    logo: number
    subscriptionStatus: number
    trialEndsAt: number
    subscriptionEndsAt: number
    _all: number
  }


  export type AgencyProfileMinAggregateInputType = {
    id?: true
    userId?: true
    companyName?: true
    ice?: true
    patente?: true
    rib?: true
    verificationStatus?: true
    bio?: true
    logo?: true
    subscriptionStatus?: true
    trialEndsAt?: true
    subscriptionEndsAt?: true
  }

  export type AgencyProfileMaxAggregateInputType = {
    id?: true
    userId?: true
    companyName?: true
    ice?: true
    patente?: true
    rib?: true
    verificationStatus?: true
    bio?: true
    logo?: true
    subscriptionStatus?: true
    trialEndsAt?: true
    subscriptionEndsAt?: true
  }

  export type AgencyProfileCountAggregateInputType = {
    id?: true
    userId?: true
    companyName?: true
    ice?: true
    patente?: true
    rib?: true
    verificationStatus?: true
    bio?: true
    logo?: true
    subscriptionStatus?: true
    trialEndsAt?: true
    subscriptionEndsAt?: true
    _all?: true
  }

  export type AgencyProfileAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AgencyProfile to aggregate.
     */
    where?: AgencyProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgencyProfiles to fetch.
     */
    orderBy?: AgencyProfileOrderByWithRelationInput | AgencyProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AgencyProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgencyProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgencyProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AgencyProfiles
    **/
    _count?: true | AgencyProfileCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AgencyProfileMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AgencyProfileMaxAggregateInputType
  }

  export type GetAgencyProfileAggregateType<T extends AgencyProfileAggregateArgs> = {
        [P in keyof T & keyof AggregateAgencyProfile]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAgencyProfile[P]>
      : GetScalarType<T[P], AggregateAgencyProfile[P]>
  }




  export type AgencyProfileGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AgencyProfileWhereInput
    orderBy?: AgencyProfileOrderByWithAggregationInput | AgencyProfileOrderByWithAggregationInput[]
    by: AgencyProfileScalarFieldEnum[] | AgencyProfileScalarFieldEnum
    having?: AgencyProfileScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AgencyProfileCountAggregateInputType | true
    _min?: AgencyProfileMinAggregateInputType
    _max?: AgencyProfileMaxAggregateInputType
  }

  export type AgencyProfileGroupByOutputType = {
    id: string
    userId: string
    companyName: string
    ice: string
    patente: string
    rib: string
    verificationStatus: $Enums.VerificationStatus
    bio: string | null
    logo: string | null
    subscriptionStatus: $Enums.SubscriptionStatus
    trialEndsAt: Date | null
    subscriptionEndsAt: Date | null
    _count: AgencyProfileCountAggregateOutputType | null
    _min: AgencyProfileMinAggregateOutputType | null
    _max: AgencyProfileMaxAggregateOutputType | null
  }

  type GetAgencyProfileGroupByPayload<T extends AgencyProfileGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AgencyProfileGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AgencyProfileGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AgencyProfileGroupByOutputType[P]>
            : GetScalarType<T[P], AgencyProfileGroupByOutputType[P]>
        }
      >
    >


  export type AgencyProfileSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    companyName?: boolean
    ice?: boolean
    patente?: boolean
    rib?: boolean
    verificationStatus?: boolean
    bio?: boolean
    logo?: boolean
    subscriptionStatus?: boolean
    trialEndsAt?: boolean
    subscriptionEndsAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    templates?: boolean | AgencyProfile$templatesArgs<ExtArgs>
    wallet?: boolean | AgencyProfile$walletArgs<ExtArgs>
    payoutRequests?: boolean | AgencyProfile$payoutRequestsArgs<ExtArgs>
    _count?: boolean | AgencyProfileCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["agencyProfile"]>

  export type AgencyProfileSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    companyName?: boolean
    ice?: boolean
    patente?: boolean
    rib?: boolean
    verificationStatus?: boolean
    bio?: boolean
    logo?: boolean
    subscriptionStatus?: boolean
    trialEndsAt?: boolean
    subscriptionEndsAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["agencyProfile"]>

  export type AgencyProfileSelectScalar = {
    id?: boolean
    userId?: boolean
    companyName?: boolean
    ice?: boolean
    patente?: boolean
    rib?: boolean
    verificationStatus?: boolean
    bio?: boolean
    logo?: boolean
    subscriptionStatus?: boolean
    trialEndsAt?: boolean
    subscriptionEndsAt?: boolean
  }

  export type AgencyProfileInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    templates?: boolean | AgencyProfile$templatesArgs<ExtArgs>
    wallet?: boolean | AgencyProfile$walletArgs<ExtArgs>
    payoutRequests?: boolean | AgencyProfile$payoutRequestsArgs<ExtArgs>
    _count?: boolean | AgencyProfileCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AgencyProfileIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $AgencyProfilePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AgencyProfile"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      templates: Prisma.$TripTemplatePayload<ExtArgs>[]
      wallet: Prisma.$WalletPayload<ExtArgs> | null
      payoutRequests: Prisma.$PayoutRequestPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      companyName: string
      ice: string
      patente: string
      rib: string
      verificationStatus: $Enums.VerificationStatus
      bio: string | null
      logo: string | null
      subscriptionStatus: $Enums.SubscriptionStatus
      trialEndsAt: Date | null
      subscriptionEndsAt: Date | null
    }, ExtArgs["result"]["agencyProfile"]>
    composites: {}
  }

  type AgencyProfileGetPayload<S extends boolean | null | undefined | AgencyProfileDefaultArgs> = $Result.GetResult<Prisma.$AgencyProfilePayload, S>

  type AgencyProfileCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<AgencyProfileFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: AgencyProfileCountAggregateInputType | true
    }

  export interface AgencyProfileDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AgencyProfile'], meta: { name: 'AgencyProfile' } }
    /**
     * Find zero or one AgencyProfile that matches the filter.
     * @param {AgencyProfileFindUniqueArgs} args - Arguments to find a AgencyProfile
     * @example
     * // Get one AgencyProfile
     * const agencyProfile = await prisma.agencyProfile.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AgencyProfileFindUniqueArgs>(args: SelectSubset<T, AgencyProfileFindUniqueArgs<ExtArgs>>): Prisma__AgencyProfileClient<$Result.GetResult<Prisma.$AgencyProfilePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one AgencyProfile that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {AgencyProfileFindUniqueOrThrowArgs} args - Arguments to find a AgencyProfile
     * @example
     * // Get one AgencyProfile
     * const agencyProfile = await prisma.agencyProfile.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AgencyProfileFindUniqueOrThrowArgs>(args: SelectSubset<T, AgencyProfileFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AgencyProfileClient<$Result.GetResult<Prisma.$AgencyProfilePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first AgencyProfile that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgencyProfileFindFirstArgs} args - Arguments to find a AgencyProfile
     * @example
     * // Get one AgencyProfile
     * const agencyProfile = await prisma.agencyProfile.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AgencyProfileFindFirstArgs>(args?: SelectSubset<T, AgencyProfileFindFirstArgs<ExtArgs>>): Prisma__AgencyProfileClient<$Result.GetResult<Prisma.$AgencyProfilePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first AgencyProfile that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgencyProfileFindFirstOrThrowArgs} args - Arguments to find a AgencyProfile
     * @example
     * // Get one AgencyProfile
     * const agencyProfile = await prisma.agencyProfile.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AgencyProfileFindFirstOrThrowArgs>(args?: SelectSubset<T, AgencyProfileFindFirstOrThrowArgs<ExtArgs>>): Prisma__AgencyProfileClient<$Result.GetResult<Prisma.$AgencyProfilePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more AgencyProfiles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgencyProfileFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AgencyProfiles
     * const agencyProfiles = await prisma.agencyProfile.findMany()
     * 
     * // Get first 10 AgencyProfiles
     * const agencyProfiles = await prisma.agencyProfile.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const agencyProfileWithIdOnly = await prisma.agencyProfile.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AgencyProfileFindManyArgs>(args?: SelectSubset<T, AgencyProfileFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AgencyProfilePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a AgencyProfile.
     * @param {AgencyProfileCreateArgs} args - Arguments to create a AgencyProfile.
     * @example
     * // Create one AgencyProfile
     * const AgencyProfile = await prisma.agencyProfile.create({
     *   data: {
     *     // ... data to create a AgencyProfile
     *   }
     * })
     * 
     */
    create<T extends AgencyProfileCreateArgs>(args: SelectSubset<T, AgencyProfileCreateArgs<ExtArgs>>): Prisma__AgencyProfileClient<$Result.GetResult<Prisma.$AgencyProfilePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many AgencyProfiles.
     * @param {AgencyProfileCreateManyArgs} args - Arguments to create many AgencyProfiles.
     * @example
     * // Create many AgencyProfiles
     * const agencyProfile = await prisma.agencyProfile.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AgencyProfileCreateManyArgs>(args?: SelectSubset<T, AgencyProfileCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AgencyProfiles and returns the data saved in the database.
     * @param {AgencyProfileCreateManyAndReturnArgs} args - Arguments to create many AgencyProfiles.
     * @example
     * // Create many AgencyProfiles
     * const agencyProfile = await prisma.agencyProfile.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AgencyProfiles and only return the `id`
     * const agencyProfileWithIdOnly = await prisma.agencyProfile.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AgencyProfileCreateManyAndReturnArgs>(args?: SelectSubset<T, AgencyProfileCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AgencyProfilePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a AgencyProfile.
     * @param {AgencyProfileDeleteArgs} args - Arguments to delete one AgencyProfile.
     * @example
     * // Delete one AgencyProfile
     * const AgencyProfile = await prisma.agencyProfile.delete({
     *   where: {
     *     // ... filter to delete one AgencyProfile
     *   }
     * })
     * 
     */
    delete<T extends AgencyProfileDeleteArgs>(args: SelectSubset<T, AgencyProfileDeleteArgs<ExtArgs>>): Prisma__AgencyProfileClient<$Result.GetResult<Prisma.$AgencyProfilePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one AgencyProfile.
     * @param {AgencyProfileUpdateArgs} args - Arguments to update one AgencyProfile.
     * @example
     * // Update one AgencyProfile
     * const agencyProfile = await prisma.agencyProfile.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AgencyProfileUpdateArgs>(args: SelectSubset<T, AgencyProfileUpdateArgs<ExtArgs>>): Prisma__AgencyProfileClient<$Result.GetResult<Prisma.$AgencyProfilePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more AgencyProfiles.
     * @param {AgencyProfileDeleteManyArgs} args - Arguments to filter AgencyProfiles to delete.
     * @example
     * // Delete a few AgencyProfiles
     * const { count } = await prisma.agencyProfile.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AgencyProfileDeleteManyArgs>(args?: SelectSubset<T, AgencyProfileDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AgencyProfiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgencyProfileUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AgencyProfiles
     * const agencyProfile = await prisma.agencyProfile.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AgencyProfileUpdateManyArgs>(args: SelectSubset<T, AgencyProfileUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one AgencyProfile.
     * @param {AgencyProfileUpsertArgs} args - Arguments to update or create a AgencyProfile.
     * @example
     * // Update or create a AgencyProfile
     * const agencyProfile = await prisma.agencyProfile.upsert({
     *   create: {
     *     // ... data to create a AgencyProfile
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AgencyProfile we want to update
     *   }
     * })
     */
    upsert<T extends AgencyProfileUpsertArgs>(args: SelectSubset<T, AgencyProfileUpsertArgs<ExtArgs>>): Prisma__AgencyProfileClient<$Result.GetResult<Prisma.$AgencyProfilePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of AgencyProfiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgencyProfileCountArgs} args - Arguments to filter AgencyProfiles to count.
     * @example
     * // Count the number of AgencyProfiles
     * const count = await prisma.agencyProfile.count({
     *   where: {
     *     // ... the filter for the AgencyProfiles we want to count
     *   }
     * })
    **/
    count<T extends AgencyProfileCountArgs>(
      args?: Subset<T, AgencyProfileCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AgencyProfileCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AgencyProfile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgencyProfileAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AgencyProfileAggregateArgs>(args: Subset<T, AgencyProfileAggregateArgs>): Prisma.PrismaPromise<GetAgencyProfileAggregateType<T>>

    /**
     * Group by AgencyProfile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgencyProfileGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AgencyProfileGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AgencyProfileGroupByArgs['orderBy'] }
        : { orderBy?: AgencyProfileGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AgencyProfileGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAgencyProfileGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AgencyProfile model
   */
  readonly fields: AgencyProfileFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AgencyProfile.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AgencyProfileClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    templates<T extends AgencyProfile$templatesArgs<ExtArgs> = {}>(args?: Subset<T, AgencyProfile$templatesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TripTemplatePayload<ExtArgs>, T, "findMany"> | Null>
    wallet<T extends AgencyProfile$walletArgs<ExtArgs> = {}>(args?: Subset<T, AgencyProfile$walletArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    payoutRequests<T extends AgencyProfile$payoutRequestsArgs<ExtArgs> = {}>(args?: Subset<T, AgencyProfile$payoutRequestsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PayoutRequestPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AgencyProfile model
   */ 
  interface AgencyProfileFieldRefs {
    readonly id: FieldRef<"AgencyProfile", 'String'>
    readonly userId: FieldRef<"AgencyProfile", 'String'>
    readonly companyName: FieldRef<"AgencyProfile", 'String'>
    readonly ice: FieldRef<"AgencyProfile", 'String'>
    readonly patente: FieldRef<"AgencyProfile", 'String'>
    readonly rib: FieldRef<"AgencyProfile", 'String'>
    readonly verificationStatus: FieldRef<"AgencyProfile", 'VerificationStatus'>
    readonly bio: FieldRef<"AgencyProfile", 'String'>
    readonly logo: FieldRef<"AgencyProfile", 'String'>
    readonly subscriptionStatus: FieldRef<"AgencyProfile", 'SubscriptionStatus'>
    readonly trialEndsAt: FieldRef<"AgencyProfile", 'DateTime'>
    readonly subscriptionEndsAt: FieldRef<"AgencyProfile", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AgencyProfile findUnique
   */
  export type AgencyProfileFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgencyProfile
     */
    select?: AgencyProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgencyProfileInclude<ExtArgs> | null
    /**
     * Filter, which AgencyProfile to fetch.
     */
    where: AgencyProfileWhereUniqueInput
  }

  /**
   * AgencyProfile findUniqueOrThrow
   */
  export type AgencyProfileFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgencyProfile
     */
    select?: AgencyProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgencyProfileInclude<ExtArgs> | null
    /**
     * Filter, which AgencyProfile to fetch.
     */
    where: AgencyProfileWhereUniqueInput
  }

  /**
   * AgencyProfile findFirst
   */
  export type AgencyProfileFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgencyProfile
     */
    select?: AgencyProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgencyProfileInclude<ExtArgs> | null
    /**
     * Filter, which AgencyProfile to fetch.
     */
    where?: AgencyProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgencyProfiles to fetch.
     */
    orderBy?: AgencyProfileOrderByWithRelationInput | AgencyProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AgencyProfiles.
     */
    cursor?: AgencyProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgencyProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgencyProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AgencyProfiles.
     */
    distinct?: AgencyProfileScalarFieldEnum | AgencyProfileScalarFieldEnum[]
  }

  /**
   * AgencyProfile findFirstOrThrow
   */
  export type AgencyProfileFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgencyProfile
     */
    select?: AgencyProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgencyProfileInclude<ExtArgs> | null
    /**
     * Filter, which AgencyProfile to fetch.
     */
    where?: AgencyProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgencyProfiles to fetch.
     */
    orderBy?: AgencyProfileOrderByWithRelationInput | AgencyProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AgencyProfiles.
     */
    cursor?: AgencyProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgencyProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgencyProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AgencyProfiles.
     */
    distinct?: AgencyProfileScalarFieldEnum | AgencyProfileScalarFieldEnum[]
  }

  /**
   * AgencyProfile findMany
   */
  export type AgencyProfileFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgencyProfile
     */
    select?: AgencyProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgencyProfileInclude<ExtArgs> | null
    /**
     * Filter, which AgencyProfiles to fetch.
     */
    where?: AgencyProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgencyProfiles to fetch.
     */
    orderBy?: AgencyProfileOrderByWithRelationInput | AgencyProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AgencyProfiles.
     */
    cursor?: AgencyProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgencyProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgencyProfiles.
     */
    skip?: number
    distinct?: AgencyProfileScalarFieldEnum | AgencyProfileScalarFieldEnum[]
  }

  /**
   * AgencyProfile create
   */
  export type AgencyProfileCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgencyProfile
     */
    select?: AgencyProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgencyProfileInclude<ExtArgs> | null
    /**
     * The data needed to create a AgencyProfile.
     */
    data: XOR<AgencyProfileCreateInput, AgencyProfileUncheckedCreateInput>
  }

  /**
   * AgencyProfile createMany
   */
  export type AgencyProfileCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AgencyProfiles.
     */
    data: AgencyProfileCreateManyInput | AgencyProfileCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AgencyProfile createManyAndReturn
   */
  export type AgencyProfileCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgencyProfile
     */
    select?: AgencyProfileSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many AgencyProfiles.
     */
    data: AgencyProfileCreateManyInput | AgencyProfileCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgencyProfileIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * AgencyProfile update
   */
  export type AgencyProfileUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgencyProfile
     */
    select?: AgencyProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgencyProfileInclude<ExtArgs> | null
    /**
     * The data needed to update a AgencyProfile.
     */
    data: XOR<AgencyProfileUpdateInput, AgencyProfileUncheckedUpdateInput>
    /**
     * Choose, which AgencyProfile to update.
     */
    where: AgencyProfileWhereUniqueInput
  }

  /**
   * AgencyProfile updateMany
   */
  export type AgencyProfileUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AgencyProfiles.
     */
    data: XOR<AgencyProfileUpdateManyMutationInput, AgencyProfileUncheckedUpdateManyInput>
    /**
     * Filter which AgencyProfiles to update
     */
    where?: AgencyProfileWhereInput
  }

  /**
   * AgencyProfile upsert
   */
  export type AgencyProfileUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgencyProfile
     */
    select?: AgencyProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgencyProfileInclude<ExtArgs> | null
    /**
     * The filter to search for the AgencyProfile to update in case it exists.
     */
    where: AgencyProfileWhereUniqueInput
    /**
     * In case the AgencyProfile found by the `where` argument doesn't exist, create a new AgencyProfile with this data.
     */
    create: XOR<AgencyProfileCreateInput, AgencyProfileUncheckedCreateInput>
    /**
     * In case the AgencyProfile was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AgencyProfileUpdateInput, AgencyProfileUncheckedUpdateInput>
  }

  /**
   * AgencyProfile delete
   */
  export type AgencyProfileDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgencyProfile
     */
    select?: AgencyProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgencyProfileInclude<ExtArgs> | null
    /**
     * Filter which AgencyProfile to delete.
     */
    where: AgencyProfileWhereUniqueInput
  }

  /**
   * AgencyProfile deleteMany
   */
  export type AgencyProfileDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AgencyProfiles to delete
     */
    where?: AgencyProfileWhereInput
  }

  /**
   * AgencyProfile.templates
   */
  export type AgencyProfile$templatesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripTemplate
     */
    select?: TripTemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripTemplateInclude<ExtArgs> | null
    where?: TripTemplateWhereInput
    orderBy?: TripTemplateOrderByWithRelationInput | TripTemplateOrderByWithRelationInput[]
    cursor?: TripTemplateWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TripTemplateScalarFieldEnum | TripTemplateScalarFieldEnum[]
  }

  /**
   * AgencyProfile.wallet
   */
  export type AgencyProfile$walletArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    where?: WalletWhereInput
  }

  /**
   * AgencyProfile.payoutRequests
   */
  export type AgencyProfile$payoutRequestsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PayoutRequest
     */
    select?: PayoutRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayoutRequestInclude<ExtArgs> | null
    where?: PayoutRequestWhereInput
    orderBy?: PayoutRequestOrderByWithRelationInput | PayoutRequestOrderByWithRelationInput[]
    cursor?: PayoutRequestWhereUniqueInput
    take?: number
    skip?: number
    distinct?: PayoutRequestScalarFieldEnum | PayoutRequestScalarFieldEnum[]
  }

  /**
   * AgencyProfile without action
   */
  export type AgencyProfileDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgencyProfile
     */
    select?: AgencyProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AgencyProfileInclude<ExtArgs> | null
  }


  /**
   * Model TripTemplate
   */

  export type AggregateTripTemplate = {
    _count: TripTemplateCountAggregateOutputType | null
    _avg: TripTemplateAvgAggregateOutputType | null
    _sum: TripTemplateSumAggregateOutputType | null
    _min: TripTemplateMinAggregateOutputType | null
    _max: TripTemplateMaxAggregateOutputType | null
  }

  export type TripTemplateAvgAggregateOutputType = {
    durationDays: number | null
    durationNights: number | null
  }

  export type TripTemplateSumAggregateOutputType = {
    durationDays: number | null
    durationNights: number | null
  }

  export type TripTemplateMinAggregateOutputType = {
    id: string | null
    agencyId: string | null
    title: string | null
    description: string | null
    category: $Enums.TripCategory | null
    startLocation: string | null
    durationDays: number | null
    durationNights: number | null
    status: $Enums.TripStatus | null
    featured: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TripTemplateMaxAggregateOutputType = {
    id: string | null
    agencyId: string | null
    title: string | null
    description: string | null
    category: $Enums.TripCategory | null
    startLocation: string | null
    durationDays: number | null
    durationNights: number | null
    status: $Enums.TripStatus | null
    featured: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type TripTemplateCountAggregateOutputType = {
    id: number
    agencyId: number
    title: number
    description: number
    category: number
    startLocation: number
    durationDays: number
    durationNights: number
    inclusions: number
    exclusions: number
    checklist: number
    images: number
    status: number
    featured: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type TripTemplateAvgAggregateInputType = {
    durationDays?: true
    durationNights?: true
  }

  export type TripTemplateSumAggregateInputType = {
    durationDays?: true
    durationNights?: true
  }

  export type TripTemplateMinAggregateInputType = {
    id?: true
    agencyId?: true
    title?: true
    description?: true
    category?: true
    startLocation?: true
    durationDays?: true
    durationNights?: true
    status?: true
    featured?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TripTemplateMaxAggregateInputType = {
    id?: true
    agencyId?: true
    title?: true
    description?: true
    category?: true
    startLocation?: true
    durationDays?: true
    durationNights?: true
    status?: true
    featured?: true
    createdAt?: true
    updatedAt?: true
  }

  export type TripTemplateCountAggregateInputType = {
    id?: true
    agencyId?: true
    title?: true
    description?: true
    category?: true
    startLocation?: true
    durationDays?: true
    durationNights?: true
    inclusions?: true
    exclusions?: true
    checklist?: true
    images?: true
    status?: true
    featured?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type TripTemplateAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TripTemplate to aggregate.
     */
    where?: TripTemplateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TripTemplates to fetch.
     */
    orderBy?: TripTemplateOrderByWithRelationInput | TripTemplateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TripTemplateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TripTemplates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TripTemplates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TripTemplates
    **/
    _count?: true | TripTemplateCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TripTemplateAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TripTemplateSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TripTemplateMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TripTemplateMaxAggregateInputType
  }

  export type GetTripTemplateAggregateType<T extends TripTemplateAggregateArgs> = {
        [P in keyof T & keyof AggregateTripTemplate]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTripTemplate[P]>
      : GetScalarType<T[P], AggregateTripTemplate[P]>
  }




  export type TripTemplateGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TripTemplateWhereInput
    orderBy?: TripTemplateOrderByWithAggregationInput | TripTemplateOrderByWithAggregationInput[]
    by: TripTemplateScalarFieldEnum[] | TripTemplateScalarFieldEnum
    having?: TripTemplateScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TripTemplateCountAggregateInputType | true
    _avg?: TripTemplateAvgAggregateInputType
    _sum?: TripTemplateSumAggregateInputType
    _min?: TripTemplateMinAggregateInputType
    _max?: TripTemplateMaxAggregateInputType
  }

  export type TripTemplateGroupByOutputType = {
    id: string
    agencyId: string
    title: string
    description: string
    category: $Enums.TripCategory
    startLocation: string
    durationDays: number
    durationNights: number
    inclusions: string[]
    exclusions: string[]
    checklist: string[]
    images: string[]
    status: $Enums.TripStatus
    featured: boolean
    createdAt: Date
    updatedAt: Date
    _count: TripTemplateCountAggregateOutputType | null
    _avg: TripTemplateAvgAggregateOutputType | null
    _sum: TripTemplateSumAggregateOutputType | null
    _min: TripTemplateMinAggregateOutputType | null
    _max: TripTemplateMaxAggregateOutputType | null
  }

  type GetTripTemplateGroupByPayload<T extends TripTemplateGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TripTemplateGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TripTemplateGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TripTemplateGroupByOutputType[P]>
            : GetScalarType<T[P], TripTemplateGroupByOutputType[P]>
        }
      >
    >


  export type TripTemplateSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    agencyId?: boolean
    title?: boolean
    description?: boolean
    category?: boolean
    startLocation?: boolean
    durationDays?: boolean
    durationNights?: boolean
    inclusions?: boolean
    exclusions?: boolean
    checklist?: boolean
    images?: boolean
    status?: boolean
    featured?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    agency?: boolean | AgencyProfileDefaultArgs<ExtArgs>
    sessions?: boolean | TripTemplate$sessionsArgs<ExtArgs>
    itinerary?: boolean | TripTemplate$itineraryArgs<ExtArgs>
    _count?: boolean | TripTemplateCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tripTemplate"]>

  export type TripTemplateSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    agencyId?: boolean
    title?: boolean
    description?: boolean
    category?: boolean
    startLocation?: boolean
    durationDays?: boolean
    durationNights?: boolean
    inclusions?: boolean
    exclusions?: boolean
    checklist?: boolean
    images?: boolean
    status?: boolean
    featured?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    agency?: boolean | AgencyProfileDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tripTemplate"]>

  export type TripTemplateSelectScalar = {
    id?: boolean
    agencyId?: boolean
    title?: boolean
    description?: boolean
    category?: boolean
    startLocation?: boolean
    durationDays?: boolean
    durationNights?: boolean
    inclusions?: boolean
    exclusions?: boolean
    checklist?: boolean
    images?: boolean
    status?: boolean
    featured?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type TripTemplateInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agency?: boolean | AgencyProfileDefaultArgs<ExtArgs>
    sessions?: boolean | TripTemplate$sessionsArgs<ExtArgs>
    itinerary?: boolean | TripTemplate$itineraryArgs<ExtArgs>
    _count?: boolean | TripTemplateCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TripTemplateIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agency?: boolean | AgencyProfileDefaultArgs<ExtArgs>
  }

  export type $TripTemplatePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TripTemplate"
    objects: {
      agency: Prisma.$AgencyProfilePayload<ExtArgs>
      sessions: Prisma.$TripSessionPayload<ExtArgs>[]
      itinerary: Prisma.$ItineraryDayPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      agencyId: string
      title: string
      description: string
      category: $Enums.TripCategory
      startLocation: string
      durationDays: number
      durationNights: number
      inclusions: string[]
      exclusions: string[]
      checklist: string[]
      images: string[]
      status: $Enums.TripStatus
      featured: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["tripTemplate"]>
    composites: {}
  }

  type TripTemplateGetPayload<S extends boolean | null | undefined | TripTemplateDefaultArgs> = $Result.GetResult<Prisma.$TripTemplatePayload, S>

  type TripTemplateCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<TripTemplateFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: TripTemplateCountAggregateInputType | true
    }

  export interface TripTemplateDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TripTemplate'], meta: { name: 'TripTemplate' } }
    /**
     * Find zero or one TripTemplate that matches the filter.
     * @param {TripTemplateFindUniqueArgs} args - Arguments to find a TripTemplate
     * @example
     * // Get one TripTemplate
     * const tripTemplate = await prisma.tripTemplate.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TripTemplateFindUniqueArgs>(args: SelectSubset<T, TripTemplateFindUniqueArgs<ExtArgs>>): Prisma__TripTemplateClient<$Result.GetResult<Prisma.$TripTemplatePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one TripTemplate that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {TripTemplateFindUniqueOrThrowArgs} args - Arguments to find a TripTemplate
     * @example
     * // Get one TripTemplate
     * const tripTemplate = await prisma.tripTemplate.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TripTemplateFindUniqueOrThrowArgs>(args: SelectSubset<T, TripTemplateFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TripTemplateClient<$Result.GetResult<Prisma.$TripTemplatePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first TripTemplate that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripTemplateFindFirstArgs} args - Arguments to find a TripTemplate
     * @example
     * // Get one TripTemplate
     * const tripTemplate = await prisma.tripTemplate.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TripTemplateFindFirstArgs>(args?: SelectSubset<T, TripTemplateFindFirstArgs<ExtArgs>>): Prisma__TripTemplateClient<$Result.GetResult<Prisma.$TripTemplatePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first TripTemplate that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripTemplateFindFirstOrThrowArgs} args - Arguments to find a TripTemplate
     * @example
     * // Get one TripTemplate
     * const tripTemplate = await prisma.tripTemplate.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TripTemplateFindFirstOrThrowArgs>(args?: SelectSubset<T, TripTemplateFindFirstOrThrowArgs<ExtArgs>>): Prisma__TripTemplateClient<$Result.GetResult<Prisma.$TripTemplatePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more TripTemplates that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripTemplateFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TripTemplates
     * const tripTemplates = await prisma.tripTemplate.findMany()
     * 
     * // Get first 10 TripTemplates
     * const tripTemplates = await prisma.tripTemplate.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const tripTemplateWithIdOnly = await prisma.tripTemplate.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TripTemplateFindManyArgs>(args?: SelectSubset<T, TripTemplateFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TripTemplatePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a TripTemplate.
     * @param {TripTemplateCreateArgs} args - Arguments to create a TripTemplate.
     * @example
     * // Create one TripTemplate
     * const TripTemplate = await prisma.tripTemplate.create({
     *   data: {
     *     // ... data to create a TripTemplate
     *   }
     * })
     * 
     */
    create<T extends TripTemplateCreateArgs>(args: SelectSubset<T, TripTemplateCreateArgs<ExtArgs>>): Prisma__TripTemplateClient<$Result.GetResult<Prisma.$TripTemplatePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many TripTemplates.
     * @param {TripTemplateCreateManyArgs} args - Arguments to create many TripTemplates.
     * @example
     * // Create many TripTemplates
     * const tripTemplate = await prisma.tripTemplate.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TripTemplateCreateManyArgs>(args?: SelectSubset<T, TripTemplateCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TripTemplates and returns the data saved in the database.
     * @param {TripTemplateCreateManyAndReturnArgs} args - Arguments to create many TripTemplates.
     * @example
     * // Create many TripTemplates
     * const tripTemplate = await prisma.tripTemplate.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TripTemplates and only return the `id`
     * const tripTemplateWithIdOnly = await prisma.tripTemplate.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TripTemplateCreateManyAndReturnArgs>(args?: SelectSubset<T, TripTemplateCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TripTemplatePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a TripTemplate.
     * @param {TripTemplateDeleteArgs} args - Arguments to delete one TripTemplate.
     * @example
     * // Delete one TripTemplate
     * const TripTemplate = await prisma.tripTemplate.delete({
     *   where: {
     *     // ... filter to delete one TripTemplate
     *   }
     * })
     * 
     */
    delete<T extends TripTemplateDeleteArgs>(args: SelectSubset<T, TripTemplateDeleteArgs<ExtArgs>>): Prisma__TripTemplateClient<$Result.GetResult<Prisma.$TripTemplatePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one TripTemplate.
     * @param {TripTemplateUpdateArgs} args - Arguments to update one TripTemplate.
     * @example
     * // Update one TripTemplate
     * const tripTemplate = await prisma.tripTemplate.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TripTemplateUpdateArgs>(args: SelectSubset<T, TripTemplateUpdateArgs<ExtArgs>>): Prisma__TripTemplateClient<$Result.GetResult<Prisma.$TripTemplatePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more TripTemplates.
     * @param {TripTemplateDeleteManyArgs} args - Arguments to filter TripTemplates to delete.
     * @example
     * // Delete a few TripTemplates
     * const { count } = await prisma.tripTemplate.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TripTemplateDeleteManyArgs>(args?: SelectSubset<T, TripTemplateDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TripTemplates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripTemplateUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TripTemplates
     * const tripTemplate = await prisma.tripTemplate.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TripTemplateUpdateManyArgs>(args: SelectSubset<T, TripTemplateUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one TripTemplate.
     * @param {TripTemplateUpsertArgs} args - Arguments to update or create a TripTemplate.
     * @example
     * // Update or create a TripTemplate
     * const tripTemplate = await prisma.tripTemplate.upsert({
     *   create: {
     *     // ... data to create a TripTemplate
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TripTemplate we want to update
     *   }
     * })
     */
    upsert<T extends TripTemplateUpsertArgs>(args: SelectSubset<T, TripTemplateUpsertArgs<ExtArgs>>): Prisma__TripTemplateClient<$Result.GetResult<Prisma.$TripTemplatePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of TripTemplates.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripTemplateCountArgs} args - Arguments to filter TripTemplates to count.
     * @example
     * // Count the number of TripTemplates
     * const count = await prisma.tripTemplate.count({
     *   where: {
     *     // ... the filter for the TripTemplates we want to count
     *   }
     * })
    **/
    count<T extends TripTemplateCountArgs>(
      args?: Subset<T, TripTemplateCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TripTemplateCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TripTemplate.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripTemplateAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TripTemplateAggregateArgs>(args: Subset<T, TripTemplateAggregateArgs>): Prisma.PrismaPromise<GetTripTemplateAggregateType<T>>

    /**
     * Group by TripTemplate.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripTemplateGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TripTemplateGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TripTemplateGroupByArgs['orderBy'] }
        : { orderBy?: TripTemplateGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TripTemplateGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTripTemplateGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TripTemplate model
   */
  readonly fields: TripTemplateFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TripTemplate.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TripTemplateClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    agency<T extends AgencyProfileDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AgencyProfileDefaultArgs<ExtArgs>>): Prisma__AgencyProfileClient<$Result.GetResult<Prisma.$AgencyProfilePayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    sessions<T extends TripTemplate$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, TripTemplate$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TripSessionPayload<ExtArgs>, T, "findMany"> | Null>
    itinerary<T extends TripTemplate$itineraryArgs<ExtArgs> = {}>(args?: Subset<T, TripTemplate$itineraryArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ItineraryDayPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TripTemplate model
   */ 
  interface TripTemplateFieldRefs {
    readonly id: FieldRef<"TripTemplate", 'String'>
    readonly agencyId: FieldRef<"TripTemplate", 'String'>
    readonly title: FieldRef<"TripTemplate", 'String'>
    readonly description: FieldRef<"TripTemplate", 'String'>
    readonly category: FieldRef<"TripTemplate", 'TripCategory'>
    readonly startLocation: FieldRef<"TripTemplate", 'String'>
    readonly durationDays: FieldRef<"TripTemplate", 'Int'>
    readonly durationNights: FieldRef<"TripTemplate", 'Int'>
    readonly inclusions: FieldRef<"TripTemplate", 'String[]'>
    readonly exclusions: FieldRef<"TripTemplate", 'String[]'>
    readonly checklist: FieldRef<"TripTemplate", 'String[]'>
    readonly images: FieldRef<"TripTemplate", 'String[]'>
    readonly status: FieldRef<"TripTemplate", 'TripStatus'>
    readonly featured: FieldRef<"TripTemplate", 'Boolean'>
    readonly createdAt: FieldRef<"TripTemplate", 'DateTime'>
    readonly updatedAt: FieldRef<"TripTemplate", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TripTemplate findUnique
   */
  export type TripTemplateFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripTemplate
     */
    select?: TripTemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripTemplateInclude<ExtArgs> | null
    /**
     * Filter, which TripTemplate to fetch.
     */
    where: TripTemplateWhereUniqueInput
  }

  /**
   * TripTemplate findUniqueOrThrow
   */
  export type TripTemplateFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripTemplate
     */
    select?: TripTemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripTemplateInclude<ExtArgs> | null
    /**
     * Filter, which TripTemplate to fetch.
     */
    where: TripTemplateWhereUniqueInput
  }

  /**
   * TripTemplate findFirst
   */
  export type TripTemplateFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripTemplate
     */
    select?: TripTemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripTemplateInclude<ExtArgs> | null
    /**
     * Filter, which TripTemplate to fetch.
     */
    where?: TripTemplateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TripTemplates to fetch.
     */
    orderBy?: TripTemplateOrderByWithRelationInput | TripTemplateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TripTemplates.
     */
    cursor?: TripTemplateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TripTemplates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TripTemplates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TripTemplates.
     */
    distinct?: TripTemplateScalarFieldEnum | TripTemplateScalarFieldEnum[]
  }

  /**
   * TripTemplate findFirstOrThrow
   */
  export type TripTemplateFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripTemplate
     */
    select?: TripTemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripTemplateInclude<ExtArgs> | null
    /**
     * Filter, which TripTemplate to fetch.
     */
    where?: TripTemplateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TripTemplates to fetch.
     */
    orderBy?: TripTemplateOrderByWithRelationInput | TripTemplateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TripTemplates.
     */
    cursor?: TripTemplateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TripTemplates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TripTemplates.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TripTemplates.
     */
    distinct?: TripTemplateScalarFieldEnum | TripTemplateScalarFieldEnum[]
  }

  /**
   * TripTemplate findMany
   */
  export type TripTemplateFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripTemplate
     */
    select?: TripTemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripTemplateInclude<ExtArgs> | null
    /**
     * Filter, which TripTemplates to fetch.
     */
    where?: TripTemplateWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TripTemplates to fetch.
     */
    orderBy?: TripTemplateOrderByWithRelationInput | TripTemplateOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TripTemplates.
     */
    cursor?: TripTemplateWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TripTemplates from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TripTemplates.
     */
    skip?: number
    distinct?: TripTemplateScalarFieldEnum | TripTemplateScalarFieldEnum[]
  }

  /**
   * TripTemplate create
   */
  export type TripTemplateCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripTemplate
     */
    select?: TripTemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripTemplateInclude<ExtArgs> | null
    /**
     * The data needed to create a TripTemplate.
     */
    data: XOR<TripTemplateCreateInput, TripTemplateUncheckedCreateInput>
  }

  /**
   * TripTemplate createMany
   */
  export type TripTemplateCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TripTemplates.
     */
    data: TripTemplateCreateManyInput | TripTemplateCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TripTemplate createManyAndReturn
   */
  export type TripTemplateCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripTemplate
     */
    select?: TripTemplateSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many TripTemplates.
     */
    data: TripTemplateCreateManyInput | TripTemplateCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripTemplateIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TripTemplate update
   */
  export type TripTemplateUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripTemplate
     */
    select?: TripTemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripTemplateInclude<ExtArgs> | null
    /**
     * The data needed to update a TripTemplate.
     */
    data: XOR<TripTemplateUpdateInput, TripTemplateUncheckedUpdateInput>
    /**
     * Choose, which TripTemplate to update.
     */
    where: TripTemplateWhereUniqueInput
  }

  /**
   * TripTemplate updateMany
   */
  export type TripTemplateUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TripTemplates.
     */
    data: XOR<TripTemplateUpdateManyMutationInput, TripTemplateUncheckedUpdateManyInput>
    /**
     * Filter which TripTemplates to update
     */
    where?: TripTemplateWhereInput
  }

  /**
   * TripTemplate upsert
   */
  export type TripTemplateUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripTemplate
     */
    select?: TripTemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripTemplateInclude<ExtArgs> | null
    /**
     * The filter to search for the TripTemplate to update in case it exists.
     */
    where: TripTemplateWhereUniqueInput
    /**
     * In case the TripTemplate found by the `where` argument doesn't exist, create a new TripTemplate with this data.
     */
    create: XOR<TripTemplateCreateInput, TripTemplateUncheckedCreateInput>
    /**
     * In case the TripTemplate was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TripTemplateUpdateInput, TripTemplateUncheckedUpdateInput>
  }

  /**
   * TripTemplate delete
   */
  export type TripTemplateDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripTemplate
     */
    select?: TripTemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripTemplateInclude<ExtArgs> | null
    /**
     * Filter which TripTemplate to delete.
     */
    where: TripTemplateWhereUniqueInput
  }

  /**
   * TripTemplate deleteMany
   */
  export type TripTemplateDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TripTemplates to delete
     */
    where?: TripTemplateWhereInput
  }

  /**
   * TripTemplate.sessions
   */
  export type TripTemplate$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripSession
     */
    select?: TripSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripSessionInclude<ExtArgs> | null
    where?: TripSessionWhereInput
    orderBy?: TripSessionOrderByWithRelationInput | TripSessionOrderByWithRelationInput[]
    cursor?: TripSessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: TripSessionScalarFieldEnum | TripSessionScalarFieldEnum[]
  }

  /**
   * TripTemplate.itinerary
   */
  export type TripTemplate$itineraryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItineraryDay
     */
    select?: ItineraryDaySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItineraryDayInclude<ExtArgs> | null
    where?: ItineraryDayWhereInput
    orderBy?: ItineraryDayOrderByWithRelationInput | ItineraryDayOrderByWithRelationInput[]
    cursor?: ItineraryDayWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ItineraryDayScalarFieldEnum | ItineraryDayScalarFieldEnum[]
  }

  /**
   * TripTemplate without action
   */
  export type TripTemplateDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripTemplate
     */
    select?: TripTemplateSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripTemplateInclude<ExtArgs> | null
  }


  /**
   * Model ItineraryDay
   */

  export type AggregateItineraryDay = {
    _count: ItineraryDayCountAggregateOutputType | null
    _avg: ItineraryDayAvgAggregateOutputType | null
    _sum: ItineraryDaySumAggregateOutputType | null
    _min: ItineraryDayMinAggregateOutputType | null
    _max: ItineraryDayMaxAggregateOutputType | null
  }

  export type ItineraryDayAvgAggregateOutputType = {
    dayNumber: number | null
  }

  export type ItineraryDaySumAggregateOutputType = {
    dayNumber: number | null
  }

  export type ItineraryDayMinAggregateOutputType = {
    id: string | null
    templateId: string | null
    dayNumber: number | null
    title: string | null
    description: string | null
  }

  export type ItineraryDayMaxAggregateOutputType = {
    id: string | null
    templateId: string | null
    dayNumber: number | null
    title: string | null
    description: string | null
  }

  export type ItineraryDayCountAggregateOutputType = {
    id: number
    templateId: number
    dayNumber: number
    title: number
    description: number
    activities: number
    _all: number
  }


  export type ItineraryDayAvgAggregateInputType = {
    dayNumber?: true
  }

  export type ItineraryDaySumAggregateInputType = {
    dayNumber?: true
  }

  export type ItineraryDayMinAggregateInputType = {
    id?: true
    templateId?: true
    dayNumber?: true
    title?: true
    description?: true
  }

  export type ItineraryDayMaxAggregateInputType = {
    id?: true
    templateId?: true
    dayNumber?: true
    title?: true
    description?: true
  }

  export type ItineraryDayCountAggregateInputType = {
    id?: true
    templateId?: true
    dayNumber?: true
    title?: true
    description?: true
    activities?: true
    _all?: true
  }

  export type ItineraryDayAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ItineraryDay to aggregate.
     */
    where?: ItineraryDayWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItineraryDays to fetch.
     */
    orderBy?: ItineraryDayOrderByWithRelationInput | ItineraryDayOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ItineraryDayWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItineraryDays from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItineraryDays.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ItineraryDays
    **/
    _count?: true | ItineraryDayCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ItineraryDayAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ItineraryDaySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ItineraryDayMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ItineraryDayMaxAggregateInputType
  }

  export type GetItineraryDayAggregateType<T extends ItineraryDayAggregateArgs> = {
        [P in keyof T & keyof AggregateItineraryDay]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateItineraryDay[P]>
      : GetScalarType<T[P], AggregateItineraryDay[P]>
  }




  export type ItineraryDayGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ItineraryDayWhereInput
    orderBy?: ItineraryDayOrderByWithAggregationInput | ItineraryDayOrderByWithAggregationInput[]
    by: ItineraryDayScalarFieldEnum[] | ItineraryDayScalarFieldEnum
    having?: ItineraryDayScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ItineraryDayCountAggregateInputType | true
    _avg?: ItineraryDayAvgAggregateInputType
    _sum?: ItineraryDaySumAggregateInputType
    _min?: ItineraryDayMinAggregateInputType
    _max?: ItineraryDayMaxAggregateInputType
  }

  export type ItineraryDayGroupByOutputType = {
    id: string
    templateId: string
    dayNumber: number
    title: string | null
    description: string
    activities: string[]
    _count: ItineraryDayCountAggregateOutputType | null
    _avg: ItineraryDayAvgAggregateOutputType | null
    _sum: ItineraryDaySumAggregateOutputType | null
    _min: ItineraryDayMinAggregateOutputType | null
    _max: ItineraryDayMaxAggregateOutputType | null
  }

  type GetItineraryDayGroupByPayload<T extends ItineraryDayGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ItineraryDayGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ItineraryDayGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ItineraryDayGroupByOutputType[P]>
            : GetScalarType<T[P], ItineraryDayGroupByOutputType[P]>
        }
      >
    >


  export type ItineraryDaySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    templateId?: boolean
    dayNumber?: boolean
    title?: boolean
    description?: boolean
    activities?: boolean
    template?: boolean | TripTemplateDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["itineraryDay"]>

  export type ItineraryDaySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    templateId?: boolean
    dayNumber?: boolean
    title?: boolean
    description?: boolean
    activities?: boolean
    template?: boolean | TripTemplateDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["itineraryDay"]>

  export type ItineraryDaySelectScalar = {
    id?: boolean
    templateId?: boolean
    dayNumber?: boolean
    title?: boolean
    description?: boolean
    activities?: boolean
  }

  export type ItineraryDayInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    template?: boolean | TripTemplateDefaultArgs<ExtArgs>
  }
  export type ItineraryDayIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    template?: boolean | TripTemplateDefaultArgs<ExtArgs>
  }

  export type $ItineraryDayPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ItineraryDay"
    objects: {
      template: Prisma.$TripTemplatePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      templateId: string
      dayNumber: number
      title: string | null
      description: string
      activities: string[]
    }, ExtArgs["result"]["itineraryDay"]>
    composites: {}
  }

  type ItineraryDayGetPayload<S extends boolean | null | undefined | ItineraryDayDefaultArgs> = $Result.GetResult<Prisma.$ItineraryDayPayload, S>

  type ItineraryDayCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ItineraryDayFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ItineraryDayCountAggregateInputType | true
    }

  export interface ItineraryDayDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ItineraryDay'], meta: { name: 'ItineraryDay' } }
    /**
     * Find zero or one ItineraryDay that matches the filter.
     * @param {ItineraryDayFindUniqueArgs} args - Arguments to find a ItineraryDay
     * @example
     * // Get one ItineraryDay
     * const itineraryDay = await prisma.itineraryDay.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ItineraryDayFindUniqueArgs>(args: SelectSubset<T, ItineraryDayFindUniqueArgs<ExtArgs>>): Prisma__ItineraryDayClient<$Result.GetResult<Prisma.$ItineraryDayPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ItineraryDay that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ItineraryDayFindUniqueOrThrowArgs} args - Arguments to find a ItineraryDay
     * @example
     * // Get one ItineraryDay
     * const itineraryDay = await prisma.itineraryDay.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ItineraryDayFindUniqueOrThrowArgs>(args: SelectSubset<T, ItineraryDayFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ItineraryDayClient<$Result.GetResult<Prisma.$ItineraryDayPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ItineraryDay that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItineraryDayFindFirstArgs} args - Arguments to find a ItineraryDay
     * @example
     * // Get one ItineraryDay
     * const itineraryDay = await prisma.itineraryDay.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ItineraryDayFindFirstArgs>(args?: SelectSubset<T, ItineraryDayFindFirstArgs<ExtArgs>>): Prisma__ItineraryDayClient<$Result.GetResult<Prisma.$ItineraryDayPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ItineraryDay that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItineraryDayFindFirstOrThrowArgs} args - Arguments to find a ItineraryDay
     * @example
     * // Get one ItineraryDay
     * const itineraryDay = await prisma.itineraryDay.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ItineraryDayFindFirstOrThrowArgs>(args?: SelectSubset<T, ItineraryDayFindFirstOrThrowArgs<ExtArgs>>): Prisma__ItineraryDayClient<$Result.GetResult<Prisma.$ItineraryDayPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ItineraryDays that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItineraryDayFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ItineraryDays
     * const itineraryDays = await prisma.itineraryDay.findMany()
     * 
     * // Get first 10 ItineraryDays
     * const itineraryDays = await prisma.itineraryDay.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const itineraryDayWithIdOnly = await prisma.itineraryDay.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ItineraryDayFindManyArgs>(args?: SelectSubset<T, ItineraryDayFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ItineraryDayPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ItineraryDay.
     * @param {ItineraryDayCreateArgs} args - Arguments to create a ItineraryDay.
     * @example
     * // Create one ItineraryDay
     * const ItineraryDay = await prisma.itineraryDay.create({
     *   data: {
     *     // ... data to create a ItineraryDay
     *   }
     * })
     * 
     */
    create<T extends ItineraryDayCreateArgs>(args: SelectSubset<T, ItineraryDayCreateArgs<ExtArgs>>): Prisma__ItineraryDayClient<$Result.GetResult<Prisma.$ItineraryDayPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ItineraryDays.
     * @param {ItineraryDayCreateManyArgs} args - Arguments to create many ItineraryDays.
     * @example
     * // Create many ItineraryDays
     * const itineraryDay = await prisma.itineraryDay.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ItineraryDayCreateManyArgs>(args?: SelectSubset<T, ItineraryDayCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ItineraryDays and returns the data saved in the database.
     * @param {ItineraryDayCreateManyAndReturnArgs} args - Arguments to create many ItineraryDays.
     * @example
     * // Create many ItineraryDays
     * const itineraryDay = await prisma.itineraryDay.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ItineraryDays and only return the `id`
     * const itineraryDayWithIdOnly = await prisma.itineraryDay.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ItineraryDayCreateManyAndReturnArgs>(args?: SelectSubset<T, ItineraryDayCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ItineraryDayPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ItineraryDay.
     * @param {ItineraryDayDeleteArgs} args - Arguments to delete one ItineraryDay.
     * @example
     * // Delete one ItineraryDay
     * const ItineraryDay = await prisma.itineraryDay.delete({
     *   where: {
     *     // ... filter to delete one ItineraryDay
     *   }
     * })
     * 
     */
    delete<T extends ItineraryDayDeleteArgs>(args: SelectSubset<T, ItineraryDayDeleteArgs<ExtArgs>>): Prisma__ItineraryDayClient<$Result.GetResult<Prisma.$ItineraryDayPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ItineraryDay.
     * @param {ItineraryDayUpdateArgs} args - Arguments to update one ItineraryDay.
     * @example
     * // Update one ItineraryDay
     * const itineraryDay = await prisma.itineraryDay.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ItineraryDayUpdateArgs>(args: SelectSubset<T, ItineraryDayUpdateArgs<ExtArgs>>): Prisma__ItineraryDayClient<$Result.GetResult<Prisma.$ItineraryDayPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ItineraryDays.
     * @param {ItineraryDayDeleteManyArgs} args - Arguments to filter ItineraryDays to delete.
     * @example
     * // Delete a few ItineraryDays
     * const { count } = await prisma.itineraryDay.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ItineraryDayDeleteManyArgs>(args?: SelectSubset<T, ItineraryDayDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ItineraryDays.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItineraryDayUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ItineraryDays
     * const itineraryDay = await prisma.itineraryDay.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ItineraryDayUpdateManyArgs>(args: SelectSubset<T, ItineraryDayUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ItineraryDay.
     * @param {ItineraryDayUpsertArgs} args - Arguments to update or create a ItineraryDay.
     * @example
     * // Update or create a ItineraryDay
     * const itineraryDay = await prisma.itineraryDay.upsert({
     *   create: {
     *     // ... data to create a ItineraryDay
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ItineraryDay we want to update
     *   }
     * })
     */
    upsert<T extends ItineraryDayUpsertArgs>(args: SelectSubset<T, ItineraryDayUpsertArgs<ExtArgs>>): Prisma__ItineraryDayClient<$Result.GetResult<Prisma.$ItineraryDayPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ItineraryDays.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItineraryDayCountArgs} args - Arguments to filter ItineraryDays to count.
     * @example
     * // Count the number of ItineraryDays
     * const count = await prisma.itineraryDay.count({
     *   where: {
     *     // ... the filter for the ItineraryDays we want to count
     *   }
     * })
    **/
    count<T extends ItineraryDayCountArgs>(
      args?: Subset<T, ItineraryDayCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ItineraryDayCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ItineraryDay.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItineraryDayAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ItineraryDayAggregateArgs>(args: Subset<T, ItineraryDayAggregateArgs>): Prisma.PrismaPromise<GetItineraryDayAggregateType<T>>

    /**
     * Group by ItineraryDay.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ItineraryDayGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ItineraryDayGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ItineraryDayGroupByArgs['orderBy'] }
        : { orderBy?: ItineraryDayGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ItineraryDayGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetItineraryDayGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ItineraryDay model
   */
  readonly fields: ItineraryDayFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ItineraryDay.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ItineraryDayClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    template<T extends TripTemplateDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TripTemplateDefaultArgs<ExtArgs>>): Prisma__TripTemplateClient<$Result.GetResult<Prisma.$TripTemplatePayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ItineraryDay model
   */ 
  interface ItineraryDayFieldRefs {
    readonly id: FieldRef<"ItineraryDay", 'String'>
    readonly templateId: FieldRef<"ItineraryDay", 'String'>
    readonly dayNumber: FieldRef<"ItineraryDay", 'Int'>
    readonly title: FieldRef<"ItineraryDay", 'String'>
    readonly description: FieldRef<"ItineraryDay", 'String'>
    readonly activities: FieldRef<"ItineraryDay", 'String[]'>
  }
    

  // Custom InputTypes
  /**
   * ItineraryDay findUnique
   */
  export type ItineraryDayFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItineraryDay
     */
    select?: ItineraryDaySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItineraryDayInclude<ExtArgs> | null
    /**
     * Filter, which ItineraryDay to fetch.
     */
    where: ItineraryDayWhereUniqueInput
  }

  /**
   * ItineraryDay findUniqueOrThrow
   */
  export type ItineraryDayFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItineraryDay
     */
    select?: ItineraryDaySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItineraryDayInclude<ExtArgs> | null
    /**
     * Filter, which ItineraryDay to fetch.
     */
    where: ItineraryDayWhereUniqueInput
  }

  /**
   * ItineraryDay findFirst
   */
  export type ItineraryDayFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItineraryDay
     */
    select?: ItineraryDaySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItineraryDayInclude<ExtArgs> | null
    /**
     * Filter, which ItineraryDay to fetch.
     */
    where?: ItineraryDayWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItineraryDays to fetch.
     */
    orderBy?: ItineraryDayOrderByWithRelationInput | ItineraryDayOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ItineraryDays.
     */
    cursor?: ItineraryDayWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItineraryDays from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItineraryDays.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ItineraryDays.
     */
    distinct?: ItineraryDayScalarFieldEnum | ItineraryDayScalarFieldEnum[]
  }

  /**
   * ItineraryDay findFirstOrThrow
   */
  export type ItineraryDayFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItineraryDay
     */
    select?: ItineraryDaySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItineraryDayInclude<ExtArgs> | null
    /**
     * Filter, which ItineraryDay to fetch.
     */
    where?: ItineraryDayWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItineraryDays to fetch.
     */
    orderBy?: ItineraryDayOrderByWithRelationInput | ItineraryDayOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ItineraryDays.
     */
    cursor?: ItineraryDayWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItineraryDays from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItineraryDays.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ItineraryDays.
     */
    distinct?: ItineraryDayScalarFieldEnum | ItineraryDayScalarFieldEnum[]
  }

  /**
   * ItineraryDay findMany
   */
  export type ItineraryDayFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItineraryDay
     */
    select?: ItineraryDaySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItineraryDayInclude<ExtArgs> | null
    /**
     * Filter, which ItineraryDays to fetch.
     */
    where?: ItineraryDayWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ItineraryDays to fetch.
     */
    orderBy?: ItineraryDayOrderByWithRelationInput | ItineraryDayOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ItineraryDays.
     */
    cursor?: ItineraryDayWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ItineraryDays from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ItineraryDays.
     */
    skip?: number
    distinct?: ItineraryDayScalarFieldEnum | ItineraryDayScalarFieldEnum[]
  }

  /**
   * ItineraryDay create
   */
  export type ItineraryDayCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItineraryDay
     */
    select?: ItineraryDaySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItineraryDayInclude<ExtArgs> | null
    /**
     * The data needed to create a ItineraryDay.
     */
    data: XOR<ItineraryDayCreateInput, ItineraryDayUncheckedCreateInput>
  }

  /**
   * ItineraryDay createMany
   */
  export type ItineraryDayCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ItineraryDays.
     */
    data: ItineraryDayCreateManyInput | ItineraryDayCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ItineraryDay createManyAndReturn
   */
  export type ItineraryDayCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItineraryDay
     */
    select?: ItineraryDaySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ItineraryDays.
     */
    data: ItineraryDayCreateManyInput | ItineraryDayCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItineraryDayIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ItineraryDay update
   */
  export type ItineraryDayUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItineraryDay
     */
    select?: ItineraryDaySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItineraryDayInclude<ExtArgs> | null
    /**
     * The data needed to update a ItineraryDay.
     */
    data: XOR<ItineraryDayUpdateInput, ItineraryDayUncheckedUpdateInput>
    /**
     * Choose, which ItineraryDay to update.
     */
    where: ItineraryDayWhereUniqueInput
  }

  /**
   * ItineraryDay updateMany
   */
  export type ItineraryDayUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ItineraryDays.
     */
    data: XOR<ItineraryDayUpdateManyMutationInput, ItineraryDayUncheckedUpdateManyInput>
    /**
     * Filter which ItineraryDays to update
     */
    where?: ItineraryDayWhereInput
  }

  /**
   * ItineraryDay upsert
   */
  export type ItineraryDayUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItineraryDay
     */
    select?: ItineraryDaySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItineraryDayInclude<ExtArgs> | null
    /**
     * The filter to search for the ItineraryDay to update in case it exists.
     */
    where: ItineraryDayWhereUniqueInput
    /**
     * In case the ItineraryDay found by the `where` argument doesn't exist, create a new ItineraryDay with this data.
     */
    create: XOR<ItineraryDayCreateInput, ItineraryDayUncheckedCreateInput>
    /**
     * In case the ItineraryDay was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ItineraryDayUpdateInput, ItineraryDayUncheckedUpdateInput>
  }

  /**
   * ItineraryDay delete
   */
  export type ItineraryDayDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItineraryDay
     */
    select?: ItineraryDaySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItineraryDayInclude<ExtArgs> | null
    /**
     * Filter which ItineraryDay to delete.
     */
    where: ItineraryDayWhereUniqueInput
  }

  /**
   * ItineraryDay deleteMany
   */
  export type ItineraryDayDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ItineraryDays to delete
     */
    where?: ItineraryDayWhereInput
  }

  /**
   * ItineraryDay without action
   */
  export type ItineraryDayDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ItineraryDay
     */
    select?: ItineraryDaySelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ItineraryDayInclude<ExtArgs> | null
  }


  /**
   * Model TripSession
   */

  export type AggregateTripSession = {
    _count: TripSessionCountAggregateOutputType | null
    _avg: TripSessionAvgAggregateOutputType | null
    _sum: TripSessionSumAggregateOutputType | null
    _min: TripSessionMinAggregateOutputType | null
    _max: TripSessionMaxAggregateOutputType | null
  }

  export type TripSessionAvgAggregateOutputType = {
    price: number | null
    deposit: number | null
    totalSeats: number | null
    availableSeats: number | null
  }

  export type TripSessionSumAggregateOutputType = {
    price: number | null
    deposit: number | null
    totalSeats: number | null
    availableSeats: number | null
  }

  export type TripSessionMinAggregateOutputType = {
    id: string | null
    templateId: string | null
    startDate: Date | null
    endDate: Date | null
    price: number | null
    deposit: number | null
    totalSeats: number | null
    availableSeats: number | null
    status: string | null
  }

  export type TripSessionMaxAggregateOutputType = {
    id: string | null
    templateId: string | null
    startDate: Date | null
    endDate: Date | null
    price: number | null
    deposit: number | null
    totalSeats: number | null
    availableSeats: number | null
    status: string | null
  }

  export type TripSessionCountAggregateOutputType = {
    id: number
    templateId: number
    startDate: number
    endDate: number
    price: number
    deposit: number
    totalSeats: number
    availableSeats: number
    status: number
    _all: number
  }


  export type TripSessionAvgAggregateInputType = {
    price?: true
    deposit?: true
    totalSeats?: true
    availableSeats?: true
  }

  export type TripSessionSumAggregateInputType = {
    price?: true
    deposit?: true
    totalSeats?: true
    availableSeats?: true
  }

  export type TripSessionMinAggregateInputType = {
    id?: true
    templateId?: true
    startDate?: true
    endDate?: true
    price?: true
    deposit?: true
    totalSeats?: true
    availableSeats?: true
    status?: true
  }

  export type TripSessionMaxAggregateInputType = {
    id?: true
    templateId?: true
    startDate?: true
    endDate?: true
    price?: true
    deposit?: true
    totalSeats?: true
    availableSeats?: true
    status?: true
  }

  export type TripSessionCountAggregateInputType = {
    id?: true
    templateId?: true
    startDate?: true
    endDate?: true
    price?: true
    deposit?: true
    totalSeats?: true
    availableSeats?: true
    status?: true
    _all?: true
  }

  export type TripSessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TripSession to aggregate.
     */
    where?: TripSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TripSessions to fetch.
     */
    orderBy?: TripSessionOrderByWithRelationInput | TripSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TripSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TripSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TripSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TripSessions
    **/
    _count?: true | TripSessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TripSessionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TripSessionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TripSessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TripSessionMaxAggregateInputType
  }

  export type GetTripSessionAggregateType<T extends TripSessionAggregateArgs> = {
        [P in keyof T & keyof AggregateTripSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTripSession[P]>
      : GetScalarType<T[P], AggregateTripSession[P]>
  }




  export type TripSessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TripSessionWhereInput
    orderBy?: TripSessionOrderByWithAggregationInput | TripSessionOrderByWithAggregationInput[]
    by: TripSessionScalarFieldEnum[] | TripSessionScalarFieldEnum
    having?: TripSessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TripSessionCountAggregateInputType | true
    _avg?: TripSessionAvgAggregateInputType
    _sum?: TripSessionSumAggregateInputType
    _min?: TripSessionMinAggregateInputType
    _max?: TripSessionMaxAggregateInputType
  }

  export type TripSessionGroupByOutputType = {
    id: string
    templateId: string
    startDate: Date
    endDate: Date
    price: number
    deposit: number
    totalSeats: number
    availableSeats: number
    status: string
    _count: TripSessionCountAggregateOutputType | null
    _avg: TripSessionAvgAggregateOutputType | null
    _sum: TripSessionSumAggregateOutputType | null
    _min: TripSessionMinAggregateOutputType | null
    _max: TripSessionMaxAggregateOutputType | null
  }

  type GetTripSessionGroupByPayload<T extends TripSessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TripSessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TripSessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TripSessionGroupByOutputType[P]>
            : GetScalarType<T[P], TripSessionGroupByOutputType[P]>
        }
      >
    >


  export type TripSessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    templateId?: boolean
    startDate?: boolean
    endDate?: boolean
    price?: boolean
    deposit?: boolean
    totalSeats?: boolean
    availableSeats?: boolean
    status?: boolean
    template?: boolean | TripTemplateDefaultArgs<ExtArgs>
    bookings?: boolean | TripSession$bookingsArgs<ExtArgs>
    _count?: boolean | TripSessionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tripSession"]>

  export type TripSessionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    templateId?: boolean
    startDate?: boolean
    endDate?: boolean
    price?: boolean
    deposit?: boolean
    totalSeats?: boolean
    availableSeats?: boolean
    status?: boolean
    template?: boolean | TripTemplateDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["tripSession"]>

  export type TripSessionSelectScalar = {
    id?: boolean
    templateId?: boolean
    startDate?: boolean
    endDate?: boolean
    price?: boolean
    deposit?: boolean
    totalSeats?: boolean
    availableSeats?: boolean
    status?: boolean
  }

  export type TripSessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    template?: boolean | TripTemplateDefaultArgs<ExtArgs>
    bookings?: boolean | TripSession$bookingsArgs<ExtArgs>
    _count?: boolean | TripSessionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type TripSessionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    template?: boolean | TripTemplateDefaultArgs<ExtArgs>
  }

  export type $TripSessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TripSession"
    objects: {
      template: Prisma.$TripTemplatePayload<ExtArgs>
      bookings: Prisma.$BookingPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      templateId: string
      startDate: Date
      endDate: Date
      price: number
      deposit: number
      totalSeats: number
      availableSeats: number
      status: string
    }, ExtArgs["result"]["tripSession"]>
    composites: {}
  }

  type TripSessionGetPayload<S extends boolean | null | undefined | TripSessionDefaultArgs> = $Result.GetResult<Prisma.$TripSessionPayload, S>

  type TripSessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<TripSessionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: TripSessionCountAggregateInputType | true
    }

  export interface TripSessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TripSession'], meta: { name: 'TripSession' } }
    /**
     * Find zero or one TripSession that matches the filter.
     * @param {TripSessionFindUniqueArgs} args - Arguments to find a TripSession
     * @example
     * // Get one TripSession
     * const tripSession = await prisma.tripSession.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TripSessionFindUniqueArgs>(args: SelectSubset<T, TripSessionFindUniqueArgs<ExtArgs>>): Prisma__TripSessionClient<$Result.GetResult<Prisma.$TripSessionPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one TripSession that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {TripSessionFindUniqueOrThrowArgs} args - Arguments to find a TripSession
     * @example
     * // Get one TripSession
     * const tripSession = await prisma.tripSession.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TripSessionFindUniqueOrThrowArgs>(args: SelectSubset<T, TripSessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TripSessionClient<$Result.GetResult<Prisma.$TripSessionPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first TripSession that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripSessionFindFirstArgs} args - Arguments to find a TripSession
     * @example
     * // Get one TripSession
     * const tripSession = await prisma.tripSession.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TripSessionFindFirstArgs>(args?: SelectSubset<T, TripSessionFindFirstArgs<ExtArgs>>): Prisma__TripSessionClient<$Result.GetResult<Prisma.$TripSessionPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first TripSession that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripSessionFindFirstOrThrowArgs} args - Arguments to find a TripSession
     * @example
     * // Get one TripSession
     * const tripSession = await prisma.tripSession.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TripSessionFindFirstOrThrowArgs>(args?: SelectSubset<T, TripSessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__TripSessionClient<$Result.GetResult<Prisma.$TripSessionPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more TripSessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripSessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TripSessions
     * const tripSessions = await prisma.tripSession.findMany()
     * 
     * // Get first 10 TripSessions
     * const tripSessions = await prisma.tripSession.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const tripSessionWithIdOnly = await prisma.tripSession.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TripSessionFindManyArgs>(args?: SelectSubset<T, TripSessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TripSessionPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a TripSession.
     * @param {TripSessionCreateArgs} args - Arguments to create a TripSession.
     * @example
     * // Create one TripSession
     * const TripSession = await prisma.tripSession.create({
     *   data: {
     *     // ... data to create a TripSession
     *   }
     * })
     * 
     */
    create<T extends TripSessionCreateArgs>(args: SelectSubset<T, TripSessionCreateArgs<ExtArgs>>): Prisma__TripSessionClient<$Result.GetResult<Prisma.$TripSessionPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many TripSessions.
     * @param {TripSessionCreateManyArgs} args - Arguments to create many TripSessions.
     * @example
     * // Create many TripSessions
     * const tripSession = await prisma.tripSession.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TripSessionCreateManyArgs>(args?: SelectSubset<T, TripSessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many TripSessions and returns the data saved in the database.
     * @param {TripSessionCreateManyAndReturnArgs} args - Arguments to create many TripSessions.
     * @example
     * // Create many TripSessions
     * const tripSession = await prisma.tripSession.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many TripSessions and only return the `id`
     * const tripSessionWithIdOnly = await prisma.tripSession.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends TripSessionCreateManyAndReturnArgs>(args?: SelectSubset<T, TripSessionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TripSessionPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a TripSession.
     * @param {TripSessionDeleteArgs} args - Arguments to delete one TripSession.
     * @example
     * // Delete one TripSession
     * const TripSession = await prisma.tripSession.delete({
     *   where: {
     *     // ... filter to delete one TripSession
     *   }
     * })
     * 
     */
    delete<T extends TripSessionDeleteArgs>(args: SelectSubset<T, TripSessionDeleteArgs<ExtArgs>>): Prisma__TripSessionClient<$Result.GetResult<Prisma.$TripSessionPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one TripSession.
     * @param {TripSessionUpdateArgs} args - Arguments to update one TripSession.
     * @example
     * // Update one TripSession
     * const tripSession = await prisma.tripSession.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TripSessionUpdateArgs>(args: SelectSubset<T, TripSessionUpdateArgs<ExtArgs>>): Prisma__TripSessionClient<$Result.GetResult<Prisma.$TripSessionPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more TripSessions.
     * @param {TripSessionDeleteManyArgs} args - Arguments to filter TripSessions to delete.
     * @example
     * // Delete a few TripSessions
     * const { count } = await prisma.tripSession.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TripSessionDeleteManyArgs>(args?: SelectSubset<T, TripSessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TripSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripSessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TripSessions
     * const tripSession = await prisma.tripSession.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TripSessionUpdateManyArgs>(args: SelectSubset<T, TripSessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one TripSession.
     * @param {TripSessionUpsertArgs} args - Arguments to update or create a TripSession.
     * @example
     * // Update or create a TripSession
     * const tripSession = await prisma.tripSession.upsert({
     *   create: {
     *     // ... data to create a TripSession
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TripSession we want to update
     *   }
     * })
     */
    upsert<T extends TripSessionUpsertArgs>(args: SelectSubset<T, TripSessionUpsertArgs<ExtArgs>>): Prisma__TripSessionClient<$Result.GetResult<Prisma.$TripSessionPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of TripSessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripSessionCountArgs} args - Arguments to filter TripSessions to count.
     * @example
     * // Count the number of TripSessions
     * const count = await prisma.tripSession.count({
     *   where: {
     *     // ... the filter for the TripSessions we want to count
     *   }
     * })
    **/
    count<T extends TripSessionCountArgs>(
      args?: Subset<T, TripSessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TripSessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TripSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripSessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TripSessionAggregateArgs>(args: Subset<T, TripSessionAggregateArgs>): Prisma.PrismaPromise<GetTripSessionAggregateType<T>>

    /**
     * Group by TripSession.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TripSessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TripSessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TripSessionGroupByArgs['orderBy'] }
        : { orderBy?: TripSessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TripSessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTripSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TripSession model
   */
  readonly fields: TripSessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TripSession.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TripSessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    template<T extends TripTemplateDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TripTemplateDefaultArgs<ExtArgs>>): Prisma__TripTemplateClient<$Result.GetResult<Prisma.$TripTemplatePayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    bookings<T extends TripSession$bookingsArgs<ExtArgs> = {}>(args?: Subset<T, TripSession$bookingsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BookingPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TripSession model
   */ 
  interface TripSessionFieldRefs {
    readonly id: FieldRef<"TripSession", 'String'>
    readonly templateId: FieldRef<"TripSession", 'String'>
    readonly startDate: FieldRef<"TripSession", 'DateTime'>
    readonly endDate: FieldRef<"TripSession", 'DateTime'>
    readonly price: FieldRef<"TripSession", 'Float'>
    readonly deposit: FieldRef<"TripSession", 'Float'>
    readonly totalSeats: FieldRef<"TripSession", 'Int'>
    readonly availableSeats: FieldRef<"TripSession", 'Int'>
    readonly status: FieldRef<"TripSession", 'String'>
  }
    

  // Custom InputTypes
  /**
   * TripSession findUnique
   */
  export type TripSessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripSession
     */
    select?: TripSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripSessionInclude<ExtArgs> | null
    /**
     * Filter, which TripSession to fetch.
     */
    where: TripSessionWhereUniqueInput
  }

  /**
   * TripSession findUniqueOrThrow
   */
  export type TripSessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripSession
     */
    select?: TripSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripSessionInclude<ExtArgs> | null
    /**
     * Filter, which TripSession to fetch.
     */
    where: TripSessionWhereUniqueInput
  }

  /**
   * TripSession findFirst
   */
  export type TripSessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripSession
     */
    select?: TripSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripSessionInclude<ExtArgs> | null
    /**
     * Filter, which TripSession to fetch.
     */
    where?: TripSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TripSessions to fetch.
     */
    orderBy?: TripSessionOrderByWithRelationInput | TripSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TripSessions.
     */
    cursor?: TripSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TripSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TripSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TripSessions.
     */
    distinct?: TripSessionScalarFieldEnum | TripSessionScalarFieldEnum[]
  }

  /**
   * TripSession findFirstOrThrow
   */
  export type TripSessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripSession
     */
    select?: TripSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripSessionInclude<ExtArgs> | null
    /**
     * Filter, which TripSession to fetch.
     */
    where?: TripSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TripSessions to fetch.
     */
    orderBy?: TripSessionOrderByWithRelationInput | TripSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TripSessions.
     */
    cursor?: TripSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TripSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TripSessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TripSessions.
     */
    distinct?: TripSessionScalarFieldEnum | TripSessionScalarFieldEnum[]
  }

  /**
   * TripSession findMany
   */
  export type TripSessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripSession
     */
    select?: TripSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripSessionInclude<ExtArgs> | null
    /**
     * Filter, which TripSessions to fetch.
     */
    where?: TripSessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TripSessions to fetch.
     */
    orderBy?: TripSessionOrderByWithRelationInput | TripSessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TripSessions.
     */
    cursor?: TripSessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TripSessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TripSessions.
     */
    skip?: number
    distinct?: TripSessionScalarFieldEnum | TripSessionScalarFieldEnum[]
  }

  /**
   * TripSession create
   */
  export type TripSessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripSession
     */
    select?: TripSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripSessionInclude<ExtArgs> | null
    /**
     * The data needed to create a TripSession.
     */
    data: XOR<TripSessionCreateInput, TripSessionUncheckedCreateInput>
  }

  /**
   * TripSession createMany
   */
  export type TripSessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TripSessions.
     */
    data: TripSessionCreateManyInput | TripSessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TripSession createManyAndReturn
   */
  export type TripSessionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripSession
     */
    select?: TripSessionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many TripSessions.
     */
    data: TripSessionCreateManyInput | TripSessionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripSessionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * TripSession update
   */
  export type TripSessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripSession
     */
    select?: TripSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripSessionInclude<ExtArgs> | null
    /**
     * The data needed to update a TripSession.
     */
    data: XOR<TripSessionUpdateInput, TripSessionUncheckedUpdateInput>
    /**
     * Choose, which TripSession to update.
     */
    where: TripSessionWhereUniqueInput
  }

  /**
   * TripSession updateMany
   */
  export type TripSessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TripSessions.
     */
    data: XOR<TripSessionUpdateManyMutationInput, TripSessionUncheckedUpdateManyInput>
    /**
     * Filter which TripSessions to update
     */
    where?: TripSessionWhereInput
  }

  /**
   * TripSession upsert
   */
  export type TripSessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripSession
     */
    select?: TripSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripSessionInclude<ExtArgs> | null
    /**
     * The filter to search for the TripSession to update in case it exists.
     */
    where: TripSessionWhereUniqueInput
    /**
     * In case the TripSession found by the `where` argument doesn't exist, create a new TripSession with this data.
     */
    create: XOR<TripSessionCreateInput, TripSessionUncheckedCreateInput>
    /**
     * In case the TripSession was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TripSessionUpdateInput, TripSessionUncheckedUpdateInput>
  }

  /**
   * TripSession delete
   */
  export type TripSessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripSession
     */
    select?: TripSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripSessionInclude<ExtArgs> | null
    /**
     * Filter which TripSession to delete.
     */
    where: TripSessionWhereUniqueInput
  }

  /**
   * TripSession deleteMany
   */
  export type TripSessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TripSessions to delete
     */
    where?: TripSessionWhereInput
  }

  /**
   * TripSession.bookings
   */
  export type TripSession$bookingsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Booking
     */
    select?: BookingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookingInclude<ExtArgs> | null
    where?: BookingWhereInput
    orderBy?: BookingOrderByWithRelationInput | BookingOrderByWithRelationInput[]
    cursor?: BookingWhereUniqueInput
    take?: number
    skip?: number
    distinct?: BookingScalarFieldEnum | BookingScalarFieldEnum[]
  }

  /**
   * TripSession without action
   */
  export type TripSessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TripSession
     */
    select?: TripSessionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TripSessionInclude<ExtArgs> | null
  }


  /**
   * Model Booking
   */

  export type AggregateBooking = {
    _count: BookingCountAggregateOutputType | null
    _avg: BookingAvgAggregateOutputType | null
    _sum: BookingSumAggregateOutputType | null
    _min: BookingMinAggregateOutputType | null
    _max: BookingMaxAggregateOutputType | null
  }

  export type BookingAvgAggregateOutputType = {
    totalAmount: number | null
    guestsCount: number | null
  }

  export type BookingSumAggregateOutputType = {
    totalAmount: number | null
    guestsCount: number | null
  }

  export type BookingMinAggregateOutputType = {
    id: string | null
    sessionId: string | null
    travelerId: string | null
    bookingDate: Date | null
    status: $Enums.BookingStatus | null
    totalAmount: number | null
    guestsCount: number | null
    paymentProofId: string | null
  }

  export type BookingMaxAggregateOutputType = {
    id: string | null
    sessionId: string | null
    travelerId: string | null
    bookingDate: Date | null
    status: $Enums.BookingStatus | null
    totalAmount: number | null
    guestsCount: number | null
    paymentProofId: string | null
  }

  export type BookingCountAggregateOutputType = {
    id: number
    sessionId: number
    travelerId: number
    bookingDate: number
    status: number
    totalAmount: number
    guestsCount: number
    paymentProofId: number
    _all: number
  }


  export type BookingAvgAggregateInputType = {
    totalAmount?: true
    guestsCount?: true
  }

  export type BookingSumAggregateInputType = {
    totalAmount?: true
    guestsCount?: true
  }

  export type BookingMinAggregateInputType = {
    id?: true
    sessionId?: true
    travelerId?: true
    bookingDate?: true
    status?: true
    totalAmount?: true
    guestsCount?: true
    paymentProofId?: true
  }

  export type BookingMaxAggregateInputType = {
    id?: true
    sessionId?: true
    travelerId?: true
    bookingDate?: true
    status?: true
    totalAmount?: true
    guestsCount?: true
    paymentProofId?: true
  }

  export type BookingCountAggregateInputType = {
    id?: true
    sessionId?: true
    travelerId?: true
    bookingDate?: true
    status?: true
    totalAmount?: true
    guestsCount?: true
    paymentProofId?: true
    _all?: true
  }

  export type BookingAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Booking to aggregate.
     */
    where?: BookingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Bookings to fetch.
     */
    orderBy?: BookingOrderByWithRelationInput | BookingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BookingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Bookings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Bookings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Bookings
    **/
    _count?: true | BookingCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: BookingAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: BookingSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BookingMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BookingMaxAggregateInputType
  }

  export type GetBookingAggregateType<T extends BookingAggregateArgs> = {
        [P in keyof T & keyof AggregateBooking]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBooking[P]>
      : GetScalarType<T[P], AggregateBooking[P]>
  }




  export type BookingGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BookingWhereInput
    orderBy?: BookingOrderByWithAggregationInput | BookingOrderByWithAggregationInput[]
    by: BookingScalarFieldEnum[] | BookingScalarFieldEnum
    having?: BookingScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BookingCountAggregateInputType | true
    _avg?: BookingAvgAggregateInputType
    _sum?: BookingSumAggregateInputType
    _min?: BookingMinAggregateInputType
    _max?: BookingMaxAggregateInputType
  }

  export type BookingGroupByOutputType = {
    id: string
    sessionId: string
    travelerId: string
    bookingDate: Date
    status: $Enums.BookingStatus
    totalAmount: number
    guestsCount: number
    paymentProofId: string | null
    _count: BookingCountAggregateOutputType | null
    _avg: BookingAvgAggregateOutputType | null
    _sum: BookingSumAggregateOutputType | null
    _min: BookingMinAggregateOutputType | null
    _max: BookingMaxAggregateOutputType | null
  }

  type GetBookingGroupByPayload<T extends BookingGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BookingGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BookingGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BookingGroupByOutputType[P]>
            : GetScalarType<T[P], BookingGroupByOutputType[P]>
        }
      >
    >


  export type BookingSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sessionId?: boolean
    travelerId?: boolean
    bookingDate?: boolean
    status?: boolean
    totalAmount?: boolean
    guestsCount?: boolean
    paymentProofId?: boolean
    session?: boolean | TripSessionDefaultArgs<ExtArgs>
    traveler?: boolean | UserDefaultArgs<ExtArgs>
    paymentProof?: boolean | Booking$paymentProofArgs<ExtArgs>
  }, ExtArgs["result"]["booking"]>

  export type BookingSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sessionId?: boolean
    travelerId?: boolean
    bookingDate?: boolean
    status?: boolean
    totalAmount?: boolean
    guestsCount?: boolean
    paymentProofId?: boolean
    session?: boolean | TripSessionDefaultArgs<ExtArgs>
    traveler?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["booking"]>

  export type BookingSelectScalar = {
    id?: boolean
    sessionId?: boolean
    travelerId?: boolean
    bookingDate?: boolean
    status?: boolean
    totalAmount?: boolean
    guestsCount?: boolean
    paymentProofId?: boolean
  }

  export type BookingInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    session?: boolean | TripSessionDefaultArgs<ExtArgs>
    traveler?: boolean | UserDefaultArgs<ExtArgs>
    paymentProof?: boolean | Booking$paymentProofArgs<ExtArgs>
  }
  export type BookingIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    session?: boolean | TripSessionDefaultArgs<ExtArgs>
    traveler?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $BookingPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Booking"
    objects: {
      session: Prisma.$TripSessionPayload<ExtArgs>
      traveler: Prisma.$UserPayload<ExtArgs>
      paymentProof: Prisma.$PaymentProofPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      sessionId: string
      travelerId: string
      bookingDate: Date
      status: $Enums.BookingStatus
      totalAmount: number
      guestsCount: number
      paymentProofId: string | null
    }, ExtArgs["result"]["booking"]>
    composites: {}
  }

  type BookingGetPayload<S extends boolean | null | undefined | BookingDefaultArgs> = $Result.GetResult<Prisma.$BookingPayload, S>

  type BookingCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<BookingFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: BookingCountAggregateInputType | true
    }

  export interface BookingDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Booking'], meta: { name: 'Booking' } }
    /**
     * Find zero or one Booking that matches the filter.
     * @param {BookingFindUniqueArgs} args - Arguments to find a Booking
     * @example
     * // Get one Booking
     * const booking = await prisma.booking.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BookingFindUniqueArgs>(args: SelectSubset<T, BookingFindUniqueArgs<ExtArgs>>): Prisma__BookingClient<$Result.GetResult<Prisma.$BookingPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Booking that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {BookingFindUniqueOrThrowArgs} args - Arguments to find a Booking
     * @example
     * // Get one Booking
     * const booking = await prisma.booking.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BookingFindUniqueOrThrowArgs>(args: SelectSubset<T, BookingFindUniqueOrThrowArgs<ExtArgs>>): Prisma__BookingClient<$Result.GetResult<Prisma.$BookingPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Booking that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BookingFindFirstArgs} args - Arguments to find a Booking
     * @example
     * // Get one Booking
     * const booking = await prisma.booking.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BookingFindFirstArgs>(args?: SelectSubset<T, BookingFindFirstArgs<ExtArgs>>): Prisma__BookingClient<$Result.GetResult<Prisma.$BookingPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Booking that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BookingFindFirstOrThrowArgs} args - Arguments to find a Booking
     * @example
     * // Get one Booking
     * const booking = await prisma.booking.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BookingFindFirstOrThrowArgs>(args?: SelectSubset<T, BookingFindFirstOrThrowArgs<ExtArgs>>): Prisma__BookingClient<$Result.GetResult<Prisma.$BookingPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Bookings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BookingFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Bookings
     * const bookings = await prisma.booking.findMany()
     * 
     * // Get first 10 Bookings
     * const bookings = await prisma.booking.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const bookingWithIdOnly = await prisma.booking.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends BookingFindManyArgs>(args?: SelectSubset<T, BookingFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BookingPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Booking.
     * @param {BookingCreateArgs} args - Arguments to create a Booking.
     * @example
     * // Create one Booking
     * const Booking = await prisma.booking.create({
     *   data: {
     *     // ... data to create a Booking
     *   }
     * })
     * 
     */
    create<T extends BookingCreateArgs>(args: SelectSubset<T, BookingCreateArgs<ExtArgs>>): Prisma__BookingClient<$Result.GetResult<Prisma.$BookingPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Bookings.
     * @param {BookingCreateManyArgs} args - Arguments to create many Bookings.
     * @example
     * // Create many Bookings
     * const booking = await prisma.booking.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends BookingCreateManyArgs>(args?: SelectSubset<T, BookingCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Bookings and returns the data saved in the database.
     * @param {BookingCreateManyAndReturnArgs} args - Arguments to create many Bookings.
     * @example
     * // Create many Bookings
     * const booking = await prisma.booking.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Bookings and only return the `id`
     * const bookingWithIdOnly = await prisma.booking.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends BookingCreateManyAndReturnArgs>(args?: SelectSubset<T, BookingCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BookingPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Booking.
     * @param {BookingDeleteArgs} args - Arguments to delete one Booking.
     * @example
     * // Delete one Booking
     * const Booking = await prisma.booking.delete({
     *   where: {
     *     // ... filter to delete one Booking
     *   }
     * })
     * 
     */
    delete<T extends BookingDeleteArgs>(args: SelectSubset<T, BookingDeleteArgs<ExtArgs>>): Prisma__BookingClient<$Result.GetResult<Prisma.$BookingPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Booking.
     * @param {BookingUpdateArgs} args - Arguments to update one Booking.
     * @example
     * // Update one Booking
     * const booking = await prisma.booking.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends BookingUpdateArgs>(args: SelectSubset<T, BookingUpdateArgs<ExtArgs>>): Prisma__BookingClient<$Result.GetResult<Prisma.$BookingPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Bookings.
     * @param {BookingDeleteManyArgs} args - Arguments to filter Bookings to delete.
     * @example
     * // Delete a few Bookings
     * const { count } = await prisma.booking.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends BookingDeleteManyArgs>(args?: SelectSubset<T, BookingDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Bookings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BookingUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Bookings
     * const booking = await prisma.booking.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends BookingUpdateManyArgs>(args: SelectSubset<T, BookingUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Booking.
     * @param {BookingUpsertArgs} args - Arguments to update or create a Booking.
     * @example
     * // Update or create a Booking
     * const booking = await prisma.booking.upsert({
     *   create: {
     *     // ... data to create a Booking
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Booking we want to update
     *   }
     * })
     */
    upsert<T extends BookingUpsertArgs>(args: SelectSubset<T, BookingUpsertArgs<ExtArgs>>): Prisma__BookingClient<$Result.GetResult<Prisma.$BookingPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Bookings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BookingCountArgs} args - Arguments to filter Bookings to count.
     * @example
     * // Count the number of Bookings
     * const count = await prisma.booking.count({
     *   where: {
     *     // ... the filter for the Bookings we want to count
     *   }
     * })
    **/
    count<T extends BookingCountArgs>(
      args?: Subset<T, BookingCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BookingCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Booking.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BookingAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BookingAggregateArgs>(args: Subset<T, BookingAggregateArgs>): Prisma.PrismaPromise<GetBookingAggregateType<T>>

    /**
     * Group by Booking.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BookingGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BookingGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BookingGroupByArgs['orderBy'] }
        : { orderBy?: BookingGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BookingGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBookingGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Booking model
   */
  readonly fields: BookingFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Booking.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BookingClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    session<T extends TripSessionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, TripSessionDefaultArgs<ExtArgs>>): Prisma__TripSessionClient<$Result.GetResult<Prisma.$TripSessionPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    traveler<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    paymentProof<T extends Booking$paymentProofArgs<ExtArgs> = {}>(args?: Subset<T, Booking$paymentProofArgs<ExtArgs>>): Prisma__PaymentProofClient<$Result.GetResult<Prisma.$PaymentProofPayload<ExtArgs>, T, "findUniqueOrThrow"> | null, null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Booking model
   */ 
  interface BookingFieldRefs {
    readonly id: FieldRef<"Booking", 'String'>
    readonly sessionId: FieldRef<"Booking", 'String'>
    readonly travelerId: FieldRef<"Booking", 'String'>
    readonly bookingDate: FieldRef<"Booking", 'DateTime'>
    readonly status: FieldRef<"Booking", 'BookingStatus'>
    readonly totalAmount: FieldRef<"Booking", 'Float'>
    readonly guestsCount: FieldRef<"Booking", 'Int'>
    readonly paymentProofId: FieldRef<"Booking", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Booking findUnique
   */
  export type BookingFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Booking
     */
    select?: BookingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookingInclude<ExtArgs> | null
    /**
     * Filter, which Booking to fetch.
     */
    where: BookingWhereUniqueInput
  }

  /**
   * Booking findUniqueOrThrow
   */
  export type BookingFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Booking
     */
    select?: BookingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookingInclude<ExtArgs> | null
    /**
     * Filter, which Booking to fetch.
     */
    where: BookingWhereUniqueInput
  }

  /**
   * Booking findFirst
   */
  export type BookingFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Booking
     */
    select?: BookingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookingInclude<ExtArgs> | null
    /**
     * Filter, which Booking to fetch.
     */
    where?: BookingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Bookings to fetch.
     */
    orderBy?: BookingOrderByWithRelationInput | BookingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Bookings.
     */
    cursor?: BookingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Bookings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Bookings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Bookings.
     */
    distinct?: BookingScalarFieldEnum | BookingScalarFieldEnum[]
  }

  /**
   * Booking findFirstOrThrow
   */
  export type BookingFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Booking
     */
    select?: BookingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookingInclude<ExtArgs> | null
    /**
     * Filter, which Booking to fetch.
     */
    where?: BookingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Bookings to fetch.
     */
    orderBy?: BookingOrderByWithRelationInput | BookingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Bookings.
     */
    cursor?: BookingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Bookings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Bookings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Bookings.
     */
    distinct?: BookingScalarFieldEnum | BookingScalarFieldEnum[]
  }

  /**
   * Booking findMany
   */
  export type BookingFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Booking
     */
    select?: BookingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookingInclude<ExtArgs> | null
    /**
     * Filter, which Bookings to fetch.
     */
    where?: BookingWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Bookings to fetch.
     */
    orderBy?: BookingOrderByWithRelationInput | BookingOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Bookings.
     */
    cursor?: BookingWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Bookings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Bookings.
     */
    skip?: number
    distinct?: BookingScalarFieldEnum | BookingScalarFieldEnum[]
  }

  /**
   * Booking create
   */
  export type BookingCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Booking
     */
    select?: BookingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookingInclude<ExtArgs> | null
    /**
     * The data needed to create a Booking.
     */
    data: XOR<BookingCreateInput, BookingUncheckedCreateInput>
  }

  /**
   * Booking createMany
   */
  export type BookingCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Bookings.
     */
    data: BookingCreateManyInput | BookingCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Booking createManyAndReturn
   */
  export type BookingCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Booking
     */
    select?: BookingSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Bookings.
     */
    data: BookingCreateManyInput | BookingCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookingIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Booking update
   */
  export type BookingUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Booking
     */
    select?: BookingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookingInclude<ExtArgs> | null
    /**
     * The data needed to update a Booking.
     */
    data: XOR<BookingUpdateInput, BookingUncheckedUpdateInput>
    /**
     * Choose, which Booking to update.
     */
    where: BookingWhereUniqueInput
  }

  /**
   * Booking updateMany
   */
  export type BookingUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Bookings.
     */
    data: XOR<BookingUpdateManyMutationInput, BookingUncheckedUpdateManyInput>
    /**
     * Filter which Bookings to update
     */
    where?: BookingWhereInput
  }

  /**
   * Booking upsert
   */
  export type BookingUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Booking
     */
    select?: BookingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookingInclude<ExtArgs> | null
    /**
     * The filter to search for the Booking to update in case it exists.
     */
    where: BookingWhereUniqueInput
    /**
     * In case the Booking found by the `where` argument doesn't exist, create a new Booking with this data.
     */
    create: XOR<BookingCreateInput, BookingUncheckedCreateInput>
    /**
     * In case the Booking was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BookingUpdateInput, BookingUncheckedUpdateInput>
  }

  /**
   * Booking delete
   */
  export type BookingDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Booking
     */
    select?: BookingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookingInclude<ExtArgs> | null
    /**
     * Filter which Booking to delete.
     */
    where: BookingWhereUniqueInput
  }

  /**
   * Booking deleteMany
   */
  export type BookingDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Bookings to delete
     */
    where?: BookingWhereInput
  }

  /**
   * Booking.paymentProof
   */
  export type Booking$paymentProofArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentProof
     */
    select?: PaymentProofSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentProofInclude<ExtArgs> | null
    where?: PaymentProofWhereInput
  }

  /**
   * Booking without action
   */
  export type BookingDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Booking
     */
    select?: BookingSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookingInclude<ExtArgs> | null
  }


  /**
   * Model PaymentProof
   */

  export type AggregatePaymentProof = {
    _count: PaymentProofCountAggregateOutputType | null
    _min: PaymentProofMinAggregateOutputType | null
    _max: PaymentProofMaxAggregateOutputType | null
  }

  export type PaymentProofMinAggregateOutputType = {
    id: string | null
    bookingId: string | null
    imageUrl: string | null
    uploadedAt: Date | null
    status: $Enums.VerificationStatus | null
  }

  export type PaymentProofMaxAggregateOutputType = {
    id: string | null
    bookingId: string | null
    imageUrl: string | null
    uploadedAt: Date | null
    status: $Enums.VerificationStatus | null
  }

  export type PaymentProofCountAggregateOutputType = {
    id: number
    bookingId: number
    imageUrl: number
    uploadedAt: number
    status: number
    _all: number
  }


  export type PaymentProofMinAggregateInputType = {
    id?: true
    bookingId?: true
    imageUrl?: true
    uploadedAt?: true
    status?: true
  }

  export type PaymentProofMaxAggregateInputType = {
    id?: true
    bookingId?: true
    imageUrl?: true
    uploadedAt?: true
    status?: true
  }

  export type PaymentProofCountAggregateInputType = {
    id?: true
    bookingId?: true
    imageUrl?: true
    uploadedAt?: true
    status?: true
    _all?: true
  }

  export type PaymentProofAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PaymentProof to aggregate.
     */
    where?: PaymentProofWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaymentProofs to fetch.
     */
    orderBy?: PaymentProofOrderByWithRelationInput | PaymentProofOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PaymentProofWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaymentProofs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaymentProofs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PaymentProofs
    **/
    _count?: true | PaymentProofCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PaymentProofMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PaymentProofMaxAggregateInputType
  }

  export type GetPaymentProofAggregateType<T extends PaymentProofAggregateArgs> = {
        [P in keyof T & keyof AggregatePaymentProof]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePaymentProof[P]>
      : GetScalarType<T[P], AggregatePaymentProof[P]>
  }




  export type PaymentProofGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PaymentProofWhereInput
    orderBy?: PaymentProofOrderByWithAggregationInput | PaymentProofOrderByWithAggregationInput[]
    by: PaymentProofScalarFieldEnum[] | PaymentProofScalarFieldEnum
    having?: PaymentProofScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PaymentProofCountAggregateInputType | true
    _min?: PaymentProofMinAggregateInputType
    _max?: PaymentProofMaxAggregateInputType
  }

  export type PaymentProofGroupByOutputType = {
    id: string
    bookingId: string
    imageUrl: string
    uploadedAt: Date
    status: $Enums.VerificationStatus
    _count: PaymentProofCountAggregateOutputType | null
    _min: PaymentProofMinAggregateOutputType | null
    _max: PaymentProofMaxAggregateOutputType | null
  }

  type GetPaymentProofGroupByPayload<T extends PaymentProofGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PaymentProofGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PaymentProofGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PaymentProofGroupByOutputType[P]>
            : GetScalarType<T[P], PaymentProofGroupByOutputType[P]>
        }
      >
    >


  export type PaymentProofSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    bookingId?: boolean
    imageUrl?: boolean
    uploadedAt?: boolean
    status?: boolean
    booking?: boolean | BookingDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["paymentProof"]>

  export type PaymentProofSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    bookingId?: boolean
    imageUrl?: boolean
    uploadedAt?: boolean
    status?: boolean
    booking?: boolean | BookingDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["paymentProof"]>

  export type PaymentProofSelectScalar = {
    id?: boolean
    bookingId?: boolean
    imageUrl?: boolean
    uploadedAt?: boolean
    status?: boolean
  }

  export type PaymentProofInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    booking?: boolean | BookingDefaultArgs<ExtArgs>
  }
  export type PaymentProofIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    booking?: boolean | BookingDefaultArgs<ExtArgs>
  }

  export type $PaymentProofPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PaymentProof"
    objects: {
      booking: Prisma.$BookingPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      bookingId: string
      imageUrl: string
      uploadedAt: Date
      status: $Enums.VerificationStatus
    }, ExtArgs["result"]["paymentProof"]>
    composites: {}
  }

  type PaymentProofGetPayload<S extends boolean | null | undefined | PaymentProofDefaultArgs> = $Result.GetResult<Prisma.$PaymentProofPayload, S>

  type PaymentProofCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<PaymentProofFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: PaymentProofCountAggregateInputType | true
    }

  export interface PaymentProofDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PaymentProof'], meta: { name: 'PaymentProof' } }
    /**
     * Find zero or one PaymentProof that matches the filter.
     * @param {PaymentProofFindUniqueArgs} args - Arguments to find a PaymentProof
     * @example
     * // Get one PaymentProof
     * const paymentProof = await prisma.paymentProof.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PaymentProofFindUniqueArgs>(args: SelectSubset<T, PaymentProofFindUniqueArgs<ExtArgs>>): Prisma__PaymentProofClient<$Result.GetResult<Prisma.$PaymentProofPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one PaymentProof that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {PaymentProofFindUniqueOrThrowArgs} args - Arguments to find a PaymentProof
     * @example
     * // Get one PaymentProof
     * const paymentProof = await prisma.paymentProof.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PaymentProofFindUniqueOrThrowArgs>(args: SelectSubset<T, PaymentProofFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PaymentProofClient<$Result.GetResult<Prisma.$PaymentProofPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first PaymentProof that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentProofFindFirstArgs} args - Arguments to find a PaymentProof
     * @example
     * // Get one PaymentProof
     * const paymentProof = await prisma.paymentProof.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PaymentProofFindFirstArgs>(args?: SelectSubset<T, PaymentProofFindFirstArgs<ExtArgs>>): Prisma__PaymentProofClient<$Result.GetResult<Prisma.$PaymentProofPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first PaymentProof that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentProofFindFirstOrThrowArgs} args - Arguments to find a PaymentProof
     * @example
     * // Get one PaymentProof
     * const paymentProof = await prisma.paymentProof.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PaymentProofFindFirstOrThrowArgs>(args?: SelectSubset<T, PaymentProofFindFirstOrThrowArgs<ExtArgs>>): Prisma__PaymentProofClient<$Result.GetResult<Prisma.$PaymentProofPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more PaymentProofs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentProofFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PaymentProofs
     * const paymentProofs = await prisma.paymentProof.findMany()
     * 
     * // Get first 10 PaymentProofs
     * const paymentProofs = await prisma.paymentProof.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const paymentProofWithIdOnly = await prisma.paymentProof.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PaymentProofFindManyArgs>(args?: SelectSubset<T, PaymentProofFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentProofPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a PaymentProof.
     * @param {PaymentProofCreateArgs} args - Arguments to create a PaymentProof.
     * @example
     * // Create one PaymentProof
     * const PaymentProof = await prisma.paymentProof.create({
     *   data: {
     *     // ... data to create a PaymentProof
     *   }
     * })
     * 
     */
    create<T extends PaymentProofCreateArgs>(args: SelectSubset<T, PaymentProofCreateArgs<ExtArgs>>): Prisma__PaymentProofClient<$Result.GetResult<Prisma.$PaymentProofPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many PaymentProofs.
     * @param {PaymentProofCreateManyArgs} args - Arguments to create many PaymentProofs.
     * @example
     * // Create many PaymentProofs
     * const paymentProof = await prisma.paymentProof.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PaymentProofCreateManyArgs>(args?: SelectSubset<T, PaymentProofCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PaymentProofs and returns the data saved in the database.
     * @param {PaymentProofCreateManyAndReturnArgs} args - Arguments to create many PaymentProofs.
     * @example
     * // Create many PaymentProofs
     * const paymentProof = await prisma.paymentProof.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PaymentProofs and only return the `id`
     * const paymentProofWithIdOnly = await prisma.paymentProof.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PaymentProofCreateManyAndReturnArgs>(args?: SelectSubset<T, PaymentProofCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PaymentProofPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a PaymentProof.
     * @param {PaymentProofDeleteArgs} args - Arguments to delete one PaymentProof.
     * @example
     * // Delete one PaymentProof
     * const PaymentProof = await prisma.paymentProof.delete({
     *   where: {
     *     // ... filter to delete one PaymentProof
     *   }
     * })
     * 
     */
    delete<T extends PaymentProofDeleteArgs>(args: SelectSubset<T, PaymentProofDeleteArgs<ExtArgs>>): Prisma__PaymentProofClient<$Result.GetResult<Prisma.$PaymentProofPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one PaymentProof.
     * @param {PaymentProofUpdateArgs} args - Arguments to update one PaymentProof.
     * @example
     * // Update one PaymentProof
     * const paymentProof = await prisma.paymentProof.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PaymentProofUpdateArgs>(args: SelectSubset<T, PaymentProofUpdateArgs<ExtArgs>>): Prisma__PaymentProofClient<$Result.GetResult<Prisma.$PaymentProofPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more PaymentProofs.
     * @param {PaymentProofDeleteManyArgs} args - Arguments to filter PaymentProofs to delete.
     * @example
     * // Delete a few PaymentProofs
     * const { count } = await prisma.paymentProof.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PaymentProofDeleteManyArgs>(args?: SelectSubset<T, PaymentProofDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PaymentProofs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentProofUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PaymentProofs
     * const paymentProof = await prisma.paymentProof.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PaymentProofUpdateManyArgs>(args: SelectSubset<T, PaymentProofUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one PaymentProof.
     * @param {PaymentProofUpsertArgs} args - Arguments to update or create a PaymentProof.
     * @example
     * // Update or create a PaymentProof
     * const paymentProof = await prisma.paymentProof.upsert({
     *   create: {
     *     // ... data to create a PaymentProof
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PaymentProof we want to update
     *   }
     * })
     */
    upsert<T extends PaymentProofUpsertArgs>(args: SelectSubset<T, PaymentProofUpsertArgs<ExtArgs>>): Prisma__PaymentProofClient<$Result.GetResult<Prisma.$PaymentProofPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of PaymentProofs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentProofCountArgs} args - Arguments to filter PaymentProofs to count.
     * @example
     * // Count the number of PaymentProofs
     * const count = await prisma.paymentProof.count({
     *   where: {
     *     // ... the filter for the PaymentProofs we want to count
     *   }
     * })
    **/
    count<T extends PaymentProofCountArgs>(
      args?: Subset<T, PaymentProofCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PaymentProofCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PaymentProof.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentProofAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PaymentProofAggregateArgs>(args: Subset<T, PaymentProofAggregateArgs>): Prisma.PrismaPromise<GetPaymentProofAggregateType<T>>

    /**
     * Group by PaymentProof.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PaymentProofGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PaymentProofGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PaymentProofGroupByArgs['orderBy'] }
        : { orderBy?: PaymentProofGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PaymentProofGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPaymentProofGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PaymentProof model
   */
  readonly fields: PaymentProofFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PaymentProof.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PaymentProofClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    booking<T extends BookingDefaultArgs<ExtArgs> = {}>(args?: Subset<T, BookingDefaultArgs<ExtArgs>>): Prisma__BookingClient<$Result.GetResult<Prisma.$BookingPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PaymentProof model
   */ 
  interface PaymentProofFieldRefs {
    readonly id: FieldRef<"PaymentProof", 'String'>
    readonly bookingId: FieldRef<"PaymentProof", 'String'>
    readonly imageUrl: FieldRef<"PaymentProof", 'String'>
    readonly uploadedAt: FieldRef<"PaymentProof", 'DateTime'>
    readonly status: FieldRef<"PaymentProof", 'VerificationStatus'>
  }
    

  // Custom InputTypes
  /**
   * PaymentProof findUnique
   */
  export type PaymentProofFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentProof
     */
    select?: PaymentProofSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentProofInclude<ExtArgs> | null
    /**
     * Filter, which PaymentProof to fetch.
     */
    where: PaymentProofWhereUniqueInput
  }

  /**
   * PaymentProof findUniqueOrThrow
   */
  export type PaymentProofFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentProof
     */
    select?: PaymentProofSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentProofInclude<ExtArgs> | null
    /**
     * Filter, which PaymentProof to fetch.
     */
    where: PaymentProofWhereUniqueInput
  }

  /**
   * PaymentProof findFirst
   */
  export type PaymentProofFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentProof
     */
    select?: PaymentProofSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentProofInclude<ExtArgs> | null
    /**
     * Filter, which PaymentProof to fetch.
     */
    where?: PaymentProofWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaymentProofs to fetch.
     */
    orderBy?: PaymentProofOrderByWithRelationInput | PaymentProofOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PaymentProofs.
     */
    cursor?: PaymentProofWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaymentProofs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaymentProofs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PaymentProofs.
     */
    distinct?: PaymentProofScalarFieldEnum | PaymentProofScalarFieldEnum[]
  }

  /**
   * PaymentProof findFirstOrThrow
   */
  export type PaymentProofFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentProof
     */
    select?: PaymentProofSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentProofInclude<ExtArgs> | null
    /**
     * Filter, which PaymentProof to fetch.
     */
    where?: PaymentProofWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaymentProofs to fetch.
     */
    orderBy?: PaymentProofOrderByWithRelationInput | PaymentProofOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PaymentProofs.
     */
    cursor?: PaymentProofWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaymentProofs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaymentProofs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PaymentProofs.
     */
    distinct?: PaymentProofScalarFieldEnum | PaymentProofScalarFieldEnum[]
  }

  /**
   * PaymentProof findMany
   */
  export type PaymentProofFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentProof
     */
    select?: PaymentProofSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentProofInclude<ExtArgs> | null
    /**
     * Filter, which PaymentProofs to fetch.
     */
    where?: PaymentProofWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PaymentProofs to fetch.
     */
    orderBy?: PaymentProofOrderByWithRelationInput | PaymentProofOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PaymentProofs.
     */
    cursor?: PaymentProofWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PaymentProofs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PaymentProofs.
     */
    skip?: number
    distinct?: PaymentProofScalarFieldEnum | PaymentProofScalarFieldEnum[]
  }

  /**
   * PaymentProof create
   */
  export type PaymentProofCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentProof
     */
    select?: PaymentProofSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentProofInclude<ExtArgs> | null
    /**
     * The data needed to create a PaymentProof.
     */
    data: XOR<PaymentProofCreateInput, PaymentProofUncheckedCreateInput>
  }

  /**
   * PaymentProof createMany
   */
  export type PaymentProofCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PaymentProofs.
     */
    data: PaymentProofCreateManyInput | PaymentProofCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PaymentProof createManyAndReturn
   */
  export type PaymentProofCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentProof
     */
    select?: PaymentProofSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many PaymentProofs.
     */
    data: PaymentProofCreateManyInput | PaymentProofCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentProofIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * PaymentProof update
   */
  export type PaymentProofUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentProof
     */
    select?: PaymentProofSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentProofInclude<ExtArgs> | null
    /**
     * The data needed to update a PaymentProof.
     */
    data: XOR<PaymentProofUpdateInput, PaymentProofUncheckedUpdateInput>
    /**
     * Choose, which PaymentProof to update.
     */
    where: PaymentProofWhereUniqueInput
  }

  /**
   * PaymentProof updateMany
   */
  export type PaymentProofUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PaymentProofs.
     */
    data: XOR<PaymentProofUpdateManyMutationInput, PaymentProofUncheckedUpdateManyInput>
    /**
     * Filter which PaymentProofs to update
     */
    where?: PaymentProofWhereInput
  }

  /**
   * PaymentProof upsert
   */
  export type PaymentProofUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentProof
     */
    select?: PaymentProofSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentProofInclude<ExtArgs> | null
    /**
     * The filter to search for the PaymentProof to update in case it exists.
     */
    where: PaymentProofWhereUniqueInput
    /**
     * In case the PaymentProof found by the `where` argument doesn't exist, create a new PaymentProof with this data.
     */
    create: XOR<PaymentProofCreateInput, PaymentProofUncheckedCreateInput>
    /**
     * In case the PaymentProof was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PaymentProofUpdateInput, PaymentProofUncheckedUpdateInput>
  }

  /**
   * PaymentProof delete
   */
  export type PaymentProofDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentProof
     */
    select?: PaymentProofSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentProofInclude<ExtArgs> | null
    /**
     * Filter which PaymentProof to delete.
     */
    where: PaymentProofWhereUniqueInput
  }

  /**
   * PaymentProof deleteMany
   */
  export type PaymentProofDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PaymentProofs to delete
     */
    where?: PaymentProofWhereInput
  }

  /**
   * PaymentProof without action
   */
  export type PaymentProofDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PaymentProof
     */
    select?: PaymentProofSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PaymentProofInclude<ExtArgs> | null
  }


  /**
   * Model Wallet
   */

  export type AggregateWallet = {
    _count: WalletCountAggregateOutputType | null
    _avg: WalletAvgAggregateOutputType | null
    _sum: WalletSumAggregateOutputType | null
    _min: WalletMinAggregateOutputType | null
    _max: WalletMaxAggregateOutputType | null
  }

  export type WalletAvgAggregateOutputType = {
    availableBalance: number | null
    pendingBalance: number | null
  }

  export type WalletSumAggregateOutputType = {
    availableBalance: number | null
    pendingBalance: number | null
  }

  export type WalletMinAggregateOutputType = {
    id: string | null
    agencyId: string | null
    availableBalance: number | null
    pendingBalance: number | null
  }

  export type WalletMaxAggregateOutputType = {
    id: string | null
    agencyId: string | null
    availableBalance: number | null
    pendingBalance: number | null
  }

  export type WalletCountAggregateOutputType = {
    id: number
    agencyId: number
    availableBalance: number
    pendingBalance: number
    _all: number
  }


  export type WalletAvgAggregateInputType = {
    availableBalance?: true
    pendingBalance?: true
  }

  export type WalletSumAggregateInputType = {
    availableBalance?: true
    pendingBalance?: true
  }

  export type WalletMinAggregateInputType = {
    id?: true
    agencyId?: true
    availableBalance?: true
    pendingBalance?: true
  }

  export type WalletMaxAggregateInputType = {
    id?: true
    agencyId?: true
    availableBalance?: true
    pendingBalance?: true
  }

  export type WalletCountAggregateInputType = {
    id?: true
    agencyId?: true
    availableBalance?: true
    pendingBalance?: true
    _all?: true
  }

  export type WalletAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Wallet to aggregate.
     */
    where?: WalletWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Wallets to fetch.
     */
    orderBy?: WalletOrderByWithRelationInput | WalletOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: WalletWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Wallets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Wallets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Wallets
    **/
    _count?: true | WalletCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: WalletAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: WalletSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: WalletMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: WalletMaxAggregateInputType
  }

  export type GetWalletAggregateType<T extends WalletAggregateArgs> = {
        [P in keyof T & keyof AggregateWallet]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWallet[P]>
      : GetScalarType<T[P], AggregateWallet[P]>
  }




  export type WalletGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WalletWhereInput
    orderBy?: WalletOrderByWithAggregationInput | WalletOrderByWithAggregationInput[]
    by: WalletScalarFieldEnum[] | WalletScalarFieldEnum
    having?: WalletScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: WalletCountAggregateInputType | true
    _avg?: WalletAvgAggregateInputType
    _sum?: WalletSumAggregateInputType
    _min?: WalletMinAggregateInputType
    _max?: WalletMaxAggregateInputType
  }

  export type WalletGroupByOutputType = {
    id: string
    agencyId: string
    availableBalance: number
    pendingBalance: number
    _count: WalletCountAggregateOutputType | null
    _avg: WalletAvgAggregateOutputType | null
    _sum: WalletSumAggregateOutputType | null
    _min: WalletMinAggregateOutputType | null
    _max: WalletMaxAggregateOutputType | null
  }

  type GetWalletGroupByPayload<T extends WalletGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<WalletGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof WalletGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], WalletGroupByOutputType[P]>
            : GetScalarType<T[P], WalletGroupByOutputType[P]>
        }
      >
    >


  export type WalletSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    agencyId?: boolean
    availableBalance?: boolean
    pendingBalance?: boolean
    agency?: boolean | AgencyProfileDefaultArgs<ExtArgs>
    transactions?: boolean | Wallet$transactionsArgs<ExtArgs>
    _count?: boolean | WalletCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["wallet"]>

  export type WalletSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    agencyId?: boolean
    availableBalance?: boolean
    pendingBalance?: boolean
    agency?: boolean | AgencyProfileDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["wallet"]>

  export type WalletSelectScalar = {
    id?: boolean
    agencyId?: boolean
    availableBalance?: boolean
    pendingBalance?: boolean
  }

  export type WalletInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agency?: boolean | AgencyProfileDefaultArgs<ExtArgs>
    transactions?: boolean | Wallet$transactionsArgs<ExtArgs>
    _count?: boolean | WalletCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type WalletIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agency?: boolean | AgencyProfileDefaultArgs<ExtArgs>
  }

  export type $WalletPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Wallet"
    objects: {
      agency: Prisma.$AgencyProfilePayload<ExtArgs>
      transactions: Prisma.$WalletTransactionPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      agencyId: string
      availableBalance: number
      pendingBalance: number
    }, ExtArgs["result"]["wallet"]>
    composites: {}
  }

  type WalletGetPayload<S extends boolean | null | undefined | WalletDefaultArgs> = $Result.GetResult<Prisma.$WalletPayload, S>

  type WalletCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<WalletFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: WalletCountAggregateInputType | true
    }

  export interface WalletDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Wallet'], meta: { name: 'Wallet' } }
    /**
     * Find zero or one Wallet that matches the filter.
     * @param {WalletFindUniqueArgs} args - Arguments to find a Wallet
     * @example
     * // Get one Wallet
     * const wallet = await prisma.wallet.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends WalletFindUniqueArgs>(args: SelectSubset<T, WalletFindUniqueArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Wallet that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {WalletFindUniqueOrThrowArgs} args - Arguments to find a Wallet
     * @example
     * // Get one Wallet
     * const wallet = await prisma.wallet.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends WalletFindUniqueOrThrowArgs>(args: SelectSubset<T, WalletFindUniqueOrThrowArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Wallet that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletFindFirstArgs} args - Arguments to find a Wallet
     * @example
     * // Get one Wallet
     * const wallet = await prisma.wallet.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends WalletFindFirstArgs>(args?: SelectSubset<T, WalletFindFirstArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Wallet that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletFindFirstOrThrowArgs} args - Arguments to find a Wallet
     * @example
     * // Get one Wallet
     * const wallet = await prisma.wallet.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends WalletFindFirstOrThrowArgs>(args?: SelectSubset<T, WalletFindFirstOrThrowArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Wallets that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Wallets
     * const wallets = await prisma.wallet.findMany()
     * 
     * // Get first 10 Wallets
     * const wallets = await prisma.wallet.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const walletWithIdOnly = await prisma.wallet.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends WalletFindManyArgs>(args?: SelectSubset<T, WalletFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Wallet.
     * @param {WalletCreateArgs} args - Arguments to create a Wallet.
     * @example
     * // Create one Wallet
     * const Wallet = await prisma.wallet.create({
     *   data: {
     *     // ... data to create a Wallet
     *   }
     * })
     * 
     */
    create<T extends WalletCreateArgs>(args: SelectSubset<T, WalletCreateArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Wallets.
     * @param {WalletCreateManyArgs} args - Arguments to create many Wallets.
     * @example
     * // Create many Wallets
     * const wallet = await prisma.wallet.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends WalletCreateManyArgs>(args?: SelectSubset<T, WalletCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Wallets and returns the data saved in the database.
     * @param {WalletCreateManyAndReturnArgs} args - Arguments to create many Wallets.
     * @example
     * // Create many Wallets
     * const wallet = await prisma.wallet.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Wallets and only return the `id`
     * const walletWithIdOnly = await prisma.wallet.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends WalletCreateManyAndReturnArgs>(args?: SelectSubset<T, WalletCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Wallet.
     * @param {WalletDeleteArgs} args - Arguments to delete one Wallet.
     * @example
     * // Delete one Wallet
     * const Wallet = await prisma.wallet.delete({
     *   where: {
     *     // ... filter to delete one Wallet
     *   }
     * })
     * 
     */
    delete<T extends WalletDeleteArgs>(args: SelectSubset<T, WalletDeleteArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Wallet.
     * @param {WalletUpdateArgs} args - Arguments to update one Wallet.
     * @example
     * // Update one Wallet
     * const wallet = await prisma.wallet.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends WalletUpdateArgs>(args: SelectSubset<T, WalletUpdateArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Wallets.
     * @param {WalletDeleteManyArgs} args - Arguments to filter Wallets to delete.
     * @example
     * // Delete a few Wallets
     * const { count } = await prisma.wallet.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends WalletDeleteManyArgs>(args?: SelectSubset<T, WalletDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Wallets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Wallets
     * const wallet = await prisma.wallet.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends WalletUpdateManyArgs>(args: SelectSubset<T, WalletUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Wallet.
     * @param {WalletUpsertArgs} args - Arguments to update or create a Wallet.
     * @example
     * // Update or create a Wallet
     * const wallet = await prisma.wallet.upsert({
     *   create: {
     *     // ... data to create a Wallet
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Wallet we want to update
     *   }
     * })
     */
    upsert<T extends WalletUpsertArgs>(args: SelectSubset<T, WalletUpsertArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Wallets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletCountArgs} args - Arguments to filter Wallets to count.
     * @example
     * // Count the number of Wallets
     * const count = await prisma.wallet.count({
     *   where: {
     *     // ... the filter for the Wallets we want to count
     *   }
     * })
    **/
    count<T extends WalletCountArgs>(
      args?: Subset<T, WalletCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], WalletCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Wallet.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends WalletAggregateArgs>(args: Subset<T, WalletAggregateArgs>): Prisma.PrismaPromise<GetWalletAggregateType<T>>

    /**
     * Group by Wallet.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends WalletGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: WalletGroupByArgs['orderBy'] }
        : { orderBy?: WalletGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, WalletGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWalletGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Wallet model
   */
  readonly fields: WalletFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Wallet.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__WalletClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    agency<T extends AgencyProfileDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AgencyProfileDefaultArgs<ExtArgs>>): Prisma__AgencyProfileClient<$Result.GetResult<Prisma.$AgencyProfilePayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    transactions<T extends Wallet$transactionsArgs<ExtArgs> = {}>(args?: Subset<T, Wallet$transactionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WalletTransactionPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Wallet model
   */ 
  interface WalletFieldRefs {
    readonly id: FieldRef<"Wallet", 'String'>
    readonly agencyId: FieldRef<"Wallet", 'String'>
    readonly availableBalance: FieldRef<"Wallet", 'Float'>
    readonly pendingBalance: FieldRef<"Wallet", 'Float'>
  }
    

  // Custom InputTypes
  /**
   * Wallet findUnique
   */
  export type WalletFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * Filter, which Wallet to fetch.
     */
    where: WalletWhereUniqueInput
  }

  /**
   * Wallet findUniqueOrThrow
   */
  export type WalletFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * Filter, which Wallet to fetch.
     */
    where: WalletWhereUniqueInput
  }

  /**
   * Wallet findFirst
   */
  export type WalletFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * Filter, which Wallet to fetch.
     */
    where?: WalletWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Wallets to fetch.
     */
    orderBy?: WalletOrderByWithRelationInput | WalletOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Wallets.
     */
    cursor?: WalletWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Wallets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Wallets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Wallets.
     */
    distinct?: WalletScalarFieldEnum | WalletScalarFieldEnum[]
  }

  /**
   * Wallet findFirstOrThrow
   */
  export type WalletFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * Filter, which Wallet to fetch.
     */
    where?: WalletWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Wallets to fetch.
     */
    orderBy?: WalletOrderByWithRelationInput | WalletOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Wallets.
     */
    cursor?: WalletWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Wallets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Wallets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Wallets.
     */
    distinct?: WalletScalarFieldEnum | WalletScalarFieldEnum[]
  }

  /**
   * Wallet findMany
   */
  export type WalletFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * Filter, which Wallets to fetch.
     */
    where?: WalletWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Wallets to fetch.
     */
    orderBy?: WalletOrderByWithRelationInput | WalletOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Wallets.
     */
    cursor?: WalletWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Wallets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Wallets.
     */
    skip?: number
    distinct?: WalletScalarFieldEnum | WalletScalarFieldEnum[]
  }

  /**
   * Wallet create
   */
  export type WalletCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * The data needed to create a Wallet.
     */
    data: XOR<WalletCreateInput, WalletUncheckedCreateInput>
  }

  /**
   * Wallet createMany
   */
  export type WalletCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Wallets.
     */
    data: WalletCreateManyInput | WalletCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Wallet createManyAndReturn
   */
  export type WalletCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Wallets.
     */
    data: WalletCreateManyInput | WalletCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Wallet update
   */
  export type WalletUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * The data needed to update a Wallet.
     */
    data: XOR<WalletUpdateInput, WalletUncheckedUpdateInput>
    /**
     * Choose, which Wallet to update.
     */
    where: WalletWhereUniqueInput
  }

  /**
   * Wallet updateMany
   */
  export type WalletUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Wallets.
     */
    data: XOR<WalletUpdateManyMutationInput, WalletUncheckedUpdateManyInput>
    /**
     * Filter which Wallets to update
     */
    where?: WalletWhereInput
  }

  /**
   * Wallet upsert
   */
  export type WalletUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * The filter to search for the Wallet to update in case it exists.
     */
    where: WalletWhereUniqueInput
    /**
     * In case the Wallet found by the `where` argument doesn't exist, create a new Wallet with this data.
     */
    create: XOR<WalletCreateInput, WalletUncheckedCreateInput>
    /**
     * In case the Wallet was found with the provided `where` argument, update it with this data.
     */
    update: XOR<WalletUpdateInput, WalletUncheckedUpdateInput>
  }

  /**
   * Wallet delete
   */
  export type WalletDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
    /**
     * Filter which Wallet to delete.
     */
    where: WalletWhereUniqueInput
  }

  /**
   * Wallet deleteMany
   */
  export type WalletDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Wallets to delete
     */
    where?: WalletWhereInput
  }

  /**
   * Wallet.transactions
   */
  export type Wallet$transactionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WalletTransaction
     */
    select?: WalletTransactionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletTransactionInclude<ExtArgs> | null
    where?: WalletTransactionWhereInput
    orderBy?: WalletTransactionOrderByWithRelationInput | WalletTransactionOrderByWithRelationInput[]
    cursor?: WalletTransactionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: WalletTransactionScalarFieldEnum | WalletTransactionScalarFieldEnum[]
  }

  /**
   * Wallet without action
   */
  export type WalletDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Wallet
     */
    select?: WalletSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletInclude<ExtArgs> | null
  }


  /**
   * Model WalletTransaction
   */

  export type AggregateWalletTransaction = {
    _count: WalletTransactionCountAggregateOutputType | null
    _avg: WalletTransactionAvgAggregateOutputType | null
    _sum: WalletTransactionSumAggregateOutputType | null
    _min: WalletTransactionMinAggregateOutputType | null
    _max: WalletTransactionMaxAggregateOutputType | null
  }

  export type WalletTransactionAvgAggregateOutputType = {
    amount: number | null
  }

  export type WalletTransactionSumAggregateOutputType = {
    amount: number | null
  }

  export type WalletTransactionMinAggregateOutputType = {
    id: string | null
    walletId: string | null
    amount: number | null
    type: $Enums.TransactionType | null
    reason: string | null
    createdAt: Date | null
  }

  export type WalletTransactionMaxAggregateOutputType = {
    id: string | null
    walletId: string | null
    amount: number | null
    type: $Enums.TransactionType | null
    reason: string | null
    createdAt: Date | null
  }

  export type WalletTransactionCountAggregateOutputType = {
    id: number
    walletId: number
    amount: number
    type: number
    reason: number
    createdAt: number
    _all: number
  }


  export type WalletTransactionAvgAggregateInputType = {
    amount?: true
  }

  export type WalletTransactionSumAggregateInputType = {
    amount?: true
  }

  export type WalletTransactionMinAggregateInputType = {
    id?: true
    walletId?: true
    amount?: true
    type?: true
    reason?: true
    createdAt?: true
  }

  export type WalletTransactionMaxAggregateInputType = {
    id?: true
    walletId?: true
    amount?: true
    type?: true
    reason?: true
    createdAt?: true
  }

  export type WalletTransactionCountAggregateInputType = {
    id?: true
    walletId?: true
    amount?: true
    type?: true
    reason?: true
    createdAt?: true
    _all?: true
  }

  export type WalletTransactionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which WalletTransaction to aggregate.
     */
    where?: WalletTransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WalletTransactions to fetch.
     */
    orderBy?: WalletTransactionOrderByWithRelationInput | WalletTransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: WalletTransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WalletTransactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WalletTransactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned WalletTransactions
    **/
    _count?: true | WalletTransactionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: WalletTransactionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: WalletTransactionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: WalletTransactionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: WalletTransactionMaxAggregateInputType
  }

  export type GetWalletTransactionAggregateType<T extends WalletTransactionAggregateArgs> = {
        [P in keyof T & keyof AggregateWalletTransaction]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateWalletTransaction[P]>
      : GetScalarType<T[P], AggregateWalletTransaction[P]>
  }




  export type WalletTransactionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: WalletTransactionWhereInput
    orderBy?: WalletTransactionOrderByWithAggregationInput | WalletTransactionOrderByWithAggregationInput[]
    by: WalletTransactionScalarFieldEnum[] | WalletTransactionScalarFieldEnum
    having?: WalletTransactionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: WalletTransactionCountAggregateInputType | true
    _avg?: WalletTransactionAvgAggregateInputType
    _sum?: WalletTransactionSumAggregateInputType
    _min?: WalletTransactionMinAggregateInputType
    _max?: WalletTransactionMaxAggregateInputType
  }

  export type WalletTransactionGroupByOutputType = {
    id: string
    walletId: string
    amount: number
    type: $Enums.TransactionType
    reason: string
    createdAt: Date
    _count: WalletTransactionCountAggregateOutputType | null
    _avg: WalletTransactionAvgAggregateOutputType | null
    _sum: WalletTransactionSumAggregateOutputType | null
    _min: WalletTransactionMinAggregateOutputType | null
    _max: WalletTransactionMaxAggregateOutputType | null
  }

  type GetWalletTransactionGroupByPayload<T extends WalletTransactionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<WalletTransactionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof WalletTransactionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], WalletTransactionGroupByOutputType[P]>
            : GetScalarType<T[P], WalletTransactionGroupByOutputType[P]>
        }
      >
    >


  export type WalletTransactionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    walletId?: boolean
    amount?: boolean
    type?: boolean
    reason?: boolean
    createdAt?: boolean
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["walletTransaction"]>

  export type WalletTransactionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    walletId?: boolean
    amount?: boolean
    type?: boolean
    reason?: boolean
    createdAt?: boolean
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["walletTransaction"]>

  export type WalletTransactionSelectScalar = {
    id?: boolean
    walletId?: boolean
    amount?: boolean
    type?: boolean
    reason?: boolean
    createdAt?: boolean
  }

  export type WalletTransactionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
  }
  export type WalletTransactionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    wallet?: boolean | WalletDefaultArgs<ExtArgs>
  }

  export type $WalletTransactionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "WalletTransaction"
    objects: {
      wallet: Prisma.$WalletPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      walletId: string
      amount: number
      type: $Enums.TransactionType
      reason: string
      createdAt: Date
    }, ExtArgs["result"]["walletTransaction"]>
    composites: {}
  }

  type WalletTransactionGetPayload<S extends boolean | null | undefined | WalletTransactionDefaultArgs> = $Result.GetResult<Prisma.$WalletTransactionPayload, S>

  type WalletTransactionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<WalletTransactionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: WalletTransactionCountAggregateInputType | true
    }

  export interface WalletTransactionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['WalletTransaction'], meta: { name: 'WalletTransaction' } }
    /**
     * Find zero or one WalletTransaction that matches the filter.
     * @param {WalletTransactionFindUniqueArgs} args - Arguments to find a WalletTransaction
     * @example
     * // Get one WalletTransaction
     * const walletTransaction = await prisma.walletTransaction.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends WalletTransactionFindUniqueArgs>(args: SelectSubset<T, WalletTransactionFindUniqueArgs<ExtArgs>>): Prisma__WalletTransactionClient<$Result.GetResult<Prisma.$WalletTransactionPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one WalletTransaction that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {WalletTransactionFindUniqueOrThrowArgs} args - Arguments to find a WalletTransaction
     * @example
     * // Get one WalletTransaction
     * const walletTransaction = await prisma.walletTransaction.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends WalletTransactionFindUniqueOrThrowArgs>(args: SelectSubset<T, WalletTransactionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__WalletTransactionClient<$Result.GetResult<Prisma.$WalletTransactionPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first WalletTransaction that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletTransactionFindFirstArgs} args - Arguments to find a WalletTransaction
     * @example
     * // Get one WalletTransaction
     * const walletTransaction = await prisma.walletTransaction.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends WalletTransactionFindFirstArgs>(args?: SelectSubset<T, WalletTransactionFindFirstArgs<ExtArgs>>): Prisma__WalletTransactionClient<$Result.GetResult<Prisma.$WalletTransactionPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first WalletTransaction that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletTransactionFindFirstOrThrowArgs} args - Arguments to find a WalletTransaction
     * @example
     * // Get one WalletTransaction
     * const walletTransaction = await prisma.walletTransaction.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends WalletTransactionFindFirstOrThrowArgs>(args?: SelectSubset<T, WalletTransactionFindFirstOrThrowArgs<ExtArgs>>): Prisma__WalletTransactionClient<$Result.GetResult<Prisma.$WalletTransactionPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more WalletTransactions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletTransactionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all WalletTransactions
     * const walletTransactions = await prisma.walletTransaction.findMany()
     * 
     * // Get first 10 WalletTransactions
     * const walletTransactions = await prisma.walletTransaction.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const walletTransactionWithIdOnly = await prisma.walletTransaction.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends WalletTransactionFindManyArgs>(args?: SelectSubset<T, WalletTransactionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WalletTransactionPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a WalletTransaction.
     * @param {WalletTransactionCreateArgs} args - Arguments to create a WalletTransaction.
     * @example
     * // Create one WalletTransaction
     * const WalletTransaction = await prisma.walletTransaction.create({
     *   data: {
     *     // ... data to create a WalletTransaction
     *   }
     * })
     * 
     */
    create<T extends WalletTransactionCreateArgs>(args: SelectSubset<T, WalletTransactionCreateArgs<ExtArgs>>): Prisma__WalletTransactionClient<$Result.GetResult<Prisma.$WalletTransactionPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many WalletTransactions.
     * @param {WalletTransactionCreateManyArgs} args - Arguments to create many WalletTransactions.
     * @example
     * // Create many WalletTransactions
     * const walletTransaction = await prisma.walletTransaction.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends WalletTransactionCreateManyArgs>(args?: SelectSubset<T, WalletTransactionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many WalletTransactions and returns the data saved in the database.
     * @param {WalletTransactionCreateManyAndReturnArgs} args - Arguments to create many WalletTransactions.
     * @example
     * // Create many WalletTransactions
     * const walletTransaction = await prisma.walletTransaction.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many WalletTransactions and only return the `id`
     * const walletTransactionWithIdOnly = await prisma.walletTransaction.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends WalletTransactionCreateManyAndReturnArgs>(args?: SelectSubset<T, WalletTransactionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$WalletTransactionPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a WalletTransaction.
     * @param {WalletTransactionDeleteArgs} args - Arguments to delete one WalletTransaction.
     * @example
     * // Delete one WalletTransaction
     * const WalletTransaction = await prisma.walletTransaction.delete({
     *   where: {
     *     // ... filter to delete one WalletTransaction
     *   }
     * })
     * 
     */
    delete<T extends WalletTransactionDeleteArgs>(args: SelectSubset<T, WalletTransactionDeleteArgs<ExtArgs>>): Prisma__WalletTransactionClient<$Result.GetResult<Prisma.$WalletTransactionPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one WalletTransaction.
     * @param {WalletTransactionUpdateArgs} args - Arguments to update one WalletTransaction.
     * @example
     * // Update one WalletTransaction
     * const walletTransaction = await prisma.walletTransaction.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends WalletTransactionUpdateArgs>(args: SelectSubset<T, WalletTransactionUpdateArgs<ExtArgs>>): Prisma__WalletTransactionClient<$Result.GetResult<Prisma.$WalletTransactionPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more WalletTransactions.
     * @param {WalletTransactionDeleteManyArgs} args - Arguments to filter WalletTransactions to delete.
     * @example
     * // Delete a few WalletTransactions
     * const { count } = await prisma.walletTransaction.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends WalletTransactionDeleteManyArgs>(args?: SelectSubset<T, WalletTransactionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more WalletTransactions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletTransactionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many WalletTransactions
     * const walletTransaction = await prisma.walletTransaction.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends WalletTransactionUpdateManyArgs>(args: SelectSubset<T, WalletTransactionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one WalletTransaction.
     * @param {WalletTransactionUpsertArgs} args - Arguments to update or create a WalletTransaction.
     * @example
     * // Update or create a WalletTransaction
     * const walletTransaction = await prisma.walletTransaction.upsert({
     *   create: {
     *     // ... data to create a WalletTransaction
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the WalletTransaction we want to update
     *   }
     * })
     */
    upsert<T extends WalletTransactionUpsertArgs>(args: SelectSubset<T, WalletTransactionUpsertArgs<ExtArgs>>): Prisma__WalletTransactionClient<$Result.GetResult<Prisma.$WalletTransactionPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of WalletTransactions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletTransactionCountArgs} args - Arguments to filter WalletTransactions to count.
     * @example
     * // Count the number of WalletTransactions
     * const count = await prisma.walletTransaction.count({
     *   where: {
     *     // ... the filter for the WalletTransactions we want to count
     *   }
     * })
    **/
    count<T extends WalletTransactionCountArgs>(
      args?: Subset<T, WalletTransactionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], WalletTransactionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a WalletTransaction.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletTransactionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends WalletTransactionAggregateArgs>(args: Subset<T, WalletTransactionAggregateArgs>): Prisma.PrismaPromise<GetWalletTransactionAggregateType<T>>

    /**
     * Group by WalletTransaction.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {WalletTransactionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends WalletTransactionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: WalletTransactionGroupByArgs['orderBy'] }
        : { orderBy?: WalletTransactionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, WalletTransactionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWalletTransactionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the WalletTransaction model
   */
  readonly fields: WalletTransactionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for WalletTransaction.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__WalletTransactionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    wallet<T extends WalletDefaultArgs<ExtArgs> = {}>(args?: Subset<T, WalletDefaultArgs<ExtArgs>>): Prisma__WalletClient<$Result.GetResult<Prisma.$WalletPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the WalletTransaction model
   */ 
  interface WalletTransactionFieldRefs {
    readonly id: FieldRef<"WalletTransaction", 'String'>
    readonly walletId: FieldRef<"WalletTransaction", 'String'>
    readonly amount: FieldRef<"WalletTransaction", 'Float'>
    readonly type: FieldRef<"WalletTransaction", 'TransactionType'>
    readonly reason: FieldRef<"WalletTransaction", 'String'>
    readonly createdAt: FieldRef<"WalletTransaction", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * WalletTransaction findUnique
   */
  export type WalletTransactionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WalletTransaction
     */
    select?: WalletTransactionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletTransactionInclude<ExtArgs> | null
    /**
     * Filter, which WalletTransaction to fetch.
     */
    where: WalletTransactionWhereUniqueInput
  }

  /**
   * WalletTransaction findUniqueOrThrow
   */
  export type WalletTransactionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WalletTransaction
     */
    select?: WalletTransactionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletTransactionInclude<ExtArgs> | null
    /**
     * Filter, which WalletTransaction to fetch.
     */
    where: WalletTransactionWhereUniqueInput
  }

  /**
   * WalletTransaction findFirst
   */
  export type WalletTransactionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WalletTransaction
     */
    select?: WalletTransactionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletTransactionInclude<ExtArgs> | null
    /**
     * Filter, which WalletTransaction to fetch.
     */
    where?: WalletTransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WalletTransactions to fetch.
     */
    orderBy?: WalletTransactionOrderByWithRelationInput | WalletTransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for WalletTransactions.
     */
    cursor?: WalletTransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WalletTransactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WalletTransactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WalletTransactions.
     */
    distinct?: WalletTransactionScalarFieldEnum | WalletTransactionScalarFieldEnum[]
  }

  /**
   * WalletTransaction findFirstOrThrow
   */
  export type WalletTransactionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WalletTransaction
     */
    select?: WalletTransactionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletTransactionInclude<ExtArgs> | null
    /**
     * Filter, which WalletTransaction to fetch.
     */
    where?: WalletTransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WalletTransactions to fetch.
     */
    orderBy?: WalletTransactionOrderByWithRelationInput | WalletTransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for WalletTransactions.
     */
    cursor?: WalletTransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WalletTransactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WalletTransactions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of WalletTransactions.
     */
    distinct?: WalletTransactionScalarFieldEnum | WalletTransactionScalarFieldEnum[]
  }

  /**
   * WalletTransaction findMany
   */
  export type WalletTransactionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WalletTransaction
     */
    select?: WalletTransactionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletTransactionInclude<ExtArgs> | null
    /**
     * Filter, which WalletTransactions to fetch.
     */
    where?: WalletTransactionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of WalletTransactions to fetch.
     */
    orderBy?: WalletTransactionOrderByWithRelationInput | WalletTransactionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing WalletTransactions.
     */
    cursor?: WalletTransactionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` WalletTransactions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` WalletTransactions.
     */
    skip?: number
    distinct?: WalletTransactionScalarFieldEnum | WalletTransactionScalarFieldEnum[]
  }

  /**
   * WalletTransaction create
   */
  export type WalletTransactionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WalletTransaction
     */
    select?: WalletTransactionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletTransactionInclude<ExtArgs> | null
    /**
     * The data needed to create a WalletTransaction.
     */
    data: XOR<WalletTransactionCreateInput, WalletTransactionUncheckedCreateInput>
  }

  /**
   * WalletTransaction createMany
   */
  export type WalletTransactionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many WalletTransactions.
     */
    data: WalletTransactionCreateManyInput | WalletTransactionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * WalletTransaction createManyAndReturn
   */
  export type WalletTransactionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WalletTransaction
     */
    select?: WalletTransactionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many WalletTransactions.
     */
    data: WalletTransactionCreateManyInput | WalletTransactionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletTransactionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * WalletTransaction update
   */
  export type WalletTransactionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WalletTransaction
     */
    select?: WalletTransactionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletTransactionInclude<ExtArgs> | null
    /**
     * The data needed to update a WalletTransaction.
     */
    data: XOR<WalletTransactionUpdateInput, WalletTransactionUncheckedUpdateInput>
    /**
     * Choose, which WalletTransaction to update.
     */
    where: WalletTransactionWhereUniqueInput
  }

  /**
   * WalletTransaction updateMany
   */
  export type WalletTransactionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update WalletTransactions.
     */
    data: XOR<WalletTransactionUpdateManyMutationInput, WalletTransactionUncheckedUpdateManyInput>
    /**
     * Filter which WalletTransactions to update
     */
    where?: WalletTransactionWhereInput
  }

  /**
   * WalletTransaction upsert
   */
  export type WalletTransactionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WalletTransaction
     */
    select?: WalletTransactionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletTransactionInclude<ExtArgs> | null
    /**
     * The filter to search for the WalletTransaction to update in case it exists.
     */
    where: WalletTransactionWhereUniqueInput
    /**
     * In case the WalletTransaction found by the `where` argument doesn't exist, create a new WalletTransaction with this data.
     */
    create: XOR<WalletTransactionCreateInput, WalletTransactionUncheckedCreateInput>
    /**
     * In case the WalletTransaction was found with the provided `where` argument, update it with this data.
     */
    update: XOR<WalletTransactionUpdateInput, WalletTransactionUncheckedUpdateInput>
  }

  /**
   * WalletTransaction delete
   */
  export type WalletTransactionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WalletTransaction
     */
    select?: WalletTransactionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletTransactionInclude<ExtArgs> | null
    /**
     * Filter which WalletTransaction to delete.
     */
    where: WalletTransactionWhereUniqueInput
  }

  /**
   * WalletTransaction deleteMany
   */
  export type WalletTransactionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which WalletTransactions to delete
     */
    where?: WalletTransactionWhereInput
  }

  /**
   * WalletTransaction without action
   */
  export type WalletTransactionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the WalletTransaction
     */
    select?: WalletTransactionSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: WalletTransactionInclude<ExtArgs> | null
  }


  /**
   * Model PayoutRequest
   */

  export type AggregatePayoutRequest = {
    _count: PayoutRequestCountAggregateOutputType | null
    _avg: PayoutRequestAvgAggregateOutputType | null
    _sum: PayoutRequestSumAggregateOutputType | null
    _min: PayoutRequestMinAggregateOutputType | null
    _max: PayoutRequestMaxAggregateOutputType | null
  }

  export type PayoutRequestAvgAggregateOutputType = {
    amount: number | null
  }

  export type PayoutRequestSumAggregateOutputType = {
    amount: number | null
  }

  export type PayoutRequestMinAggregateOutputType = {
    id: string | null
    agencyId: string | null
    amount: number | null
    status: $Enums.PayoutStatus | null
    requestedAt: Date | null
    processedAt: Date | null
    bankDetails: string | null
  }

  export type PayoutRequestMaxAggregateOutputType = {
    id: string | null
    agencyId: string | null
    amount: number | null
    status: $Enums.PayoutStatus | null
    requestedAt: Date | null
    processedAt: Date | null
    bankDetails: string | null
  }

  export type PayoutRequestCountAggregateOutputType = {
    id: number
    agencyId: number
    amount: number
    status: number
    requestedAt: number
    processedAt: number
    bankDetails: number
    _all: number
  }


  export type PayoutRequestAvgAggregateInputType = {
    amount?: true
  }

  export type PayoutRequestSumAggregateInputType = {
    amount?: true
  }

  export type PayoutRequestMinAggregateInputType = {
    id?: true
    agencyId?: true
    amount?: true
    status?: true
    requestedAt?: true
    processedAt?: true
    bankDetails?: true
  }

  export type PayoutRequestMaxAggregateInputType = {
    id?: true
    agencyId?: true
    amount?: true
    status?: true
    requestedAt?: true
    processedAt?: true
    bankDetails?: true
  }

  export type PayoutRequestCountAggregateInputType = {
    id?: true
    agencyId?: true
    amount?: true
    status?: true
    requestedAt?: true
    processedAt?: true
    bankDetails?: true
    _all?: true
  }

  export type PayoutRequestAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PayoutRequest to aggregate.
     */
    where?: PayoutRequestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PayoutRequests to fetch.
     */
    orderBy?: PayoutRequestOrderByWithRelationInput | PayoutRequestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PayoutRequestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PayoutRequests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PayoutRequests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PayoutRequests
    **/
    _count?: true | PayoutRequestCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PayoutRequestAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PayoutRequestSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PayoutRequestMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PayoutRequestMaxAggregateInputType
  }

  export type GetPayoutRequestAggregateType<T extends PayoutRequestAggregateArgs> = {
        [P in keyof T & keyof AggregatePayoutRequest]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePayoutRequest[P]>
      : GetScalarType<T[P], AggregatePayoutRequest[P]>
  }




  export type PayoutRequestGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PayoutRequestWhereInput
    orderBy?: PayoutRequestOrderByWithAggregationInput | PayoutRequestOrderByWithAggregationInput[]
    by: PayoutRequestScalarFieldEnum[] | PayoutRequestScalarFieldEnum
    having?: PayoutRequestScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PayoutRequestCountAggregateInputType | true
    _avg?: PayoutRequestAvgAggregateInputType
    _sum?: PayoutRequestSumAggregateInputType
    _min?: PayoutRequestMinAggregateInputType
    _max?: PayoutRequestMaxAggregateInputType
  }

  export type PayoutRequestGroupByOutputType = {
    id: string
    agencyId: string
    amount: number
    status: $Enums.PayoutStatus
    requestedAt: Date
    processedAt: Date | null
    bankDetails: string
    _count: PayoutRequestCountAggregateOutputType | null
    _avg: PayoutRequestAvgAggregateOutputType | null
    _sum: PayoutRequestSumAggregateOutputType | null
    _min: PayoutRequestMinAggregateOutputType | null
    _max: PayoutRequestMaxAggregateOutputType | null
  }

  type GetPayoutRequestGroupByPayload<T extends PayoutRequestGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PayoutRequestGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PayoutRequestGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PayoutRequestGroupByOutputType[P]>
            : GetScalarType<T[P], PayoutRequestGroupByOutputType[P]>
        }
      >
    >


  export type PayoutRequestSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    agencyId?: boolean
    amount?: boolean
    status?: boolean
    requestedAt?: boolean
    processedAt?: boolean
    bankDetails?: boolean
    agency?: boolean | AgencyProfileDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["payoutRequest"]>

  export type PayoutRequestSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    agencyId?: boolean
    amount?: boolean
    status?: boolean
    requestedAt?: boolean
    processedAt?: boolean
    bankDetails?: boolean
    agency?: boolean | AgencyProfileDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["payoutRequest"]>

  export type PayoutRequestSelectScalar = {
    id?: boolean
    agencyId?: boolean
    amount?: boolean
    status?: boolean
    requestedAt?: boolean
    processedAt?: boolean
    bankDetails?: boolean
  }

  export type PayoutRequestInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agency?: boolean | AgencyProfileDefaultArgs<ExtArgs>
  }
  export type PayoutRequestIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    agency?: boolean | AgencyProfileDefaultArgs<ExtArgs>
  }

  export type $PayoutRequestPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PayoutRequest"
    objects: {
      agency: Prisma.$AgencyProfilePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      agencyId: string
      amount: number
      status: $Enums.PayoutStatus
      requestedAt: Date
      processedAt: Date | null
      bankDetails: string
    }, ExtArgs["result"]["payoutRequest"]>
    composites: {}
  }

  type PayoutRequestGetPayload<S extends boolean | null | undefined | PayoutRequestDefaultArgs> = $Result.GetResult<Prisma.$PayoutRequestPayload, S>

  type PayoutRequestCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<PayoutRequestFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: PayoutRequestCountAggregateInputType | true
    }

  export interface PayoutRequestDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PayoutRequest'], meta: { name: 'PayoutRequest' } }
    /**
     * Find zero or one PayoutRequest that matches the filter.
     * @param {PayoutRequestFindUniqueArgs} args - Arguments to find a PayoutRequest
     * @example
     * // Get one PayoutRequest
     * const payoutRequest = await prisma.payoutRequest.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PayoutRequestFindUniqueArgs>(args: SelectSubset<T, PayoutRequestFindUniqueArgs<ExtArgs>>): Prisma__PayoutRequestClient<$Result.GetResult<Prisma.$PayoutRequestPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one PayoutRequest that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {PayoutRequestFindUniqueOrThrowArgs} args - Arguments to find a PayoutRequest
     * @example
     * // Get one PayoutRequest
     * const payoutRequest = await prisma.payoutRequest.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PayoutRequestFindUniqueOrThrowArgs>(args: SelectSubset<T, PayoutRequestFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PayoutRequestClient<$Result.GetResult<Prisma.$PayoutRequestPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first PayoutRequest that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PayoutRequestFindFirstArgs} args - Arguments to find a PayoutRequest
     * @example
     * // Get one PayoutRequest
     * const payoutRequest = await prisma.payoutRequest.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PayoutRequestFindFirstArgs>(args?: SelectSubset<T, PayoutRequestFindFirstArgs<ExtArgs>>): Prisma__PayoutRequestClient<$Result.GetResult<Prisma.$PayoutRequestPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first PayoutRequest that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PayoutRequestFindFirstOrThrowArgs} args - Arguments to find a PayoutRequest
     * @example
     * // Get one PayoutRequest
     * const payoutRequest = await prisma.payoutRequest.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PayoutRequestFindFirstOrThrowArgs>(args?: SelectSubset<T, PayoutRequestFindFirstOrThrowArgs<ExtArgs>>): Prisma__PayoutRequestClient<$Result.GetResult<Prisma.$PayoutRequestPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more PayoutRequests that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PayoutRequestFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PayoutRequests
     * const payoutRequests = await prisma.payoutRequest.findMany()
     * 
     * // Get first 10 PayoutRequests
     * const payoutRequests = await prisma.payoutRequest.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const payoutRequestWithIdOnly = await prisma.payoutRequest.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PayoutRequestFindManyArgs>(args?: SelectSubset<T, PayoutRequestFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PayoutRequestPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a PayoutRequest.
     * @param {PayoutRequestCreateArgs} args - Arguments to create a PayoutRequest.
     * @example
     * // Create one PayoutRequest
     * const PayoutRequest = await prisma.payoutRequest.create({
     *   data: {
     *     // ... data to create a PayoutRequest
     *   }
     * })
     * 
     */
    create<T extends PayoutRequestCreateArgs>(args: SelectSubset<T, PayoutRequestCreateArgs<ExtArgs>>): Prisma__PayoutRequestClient<$Result.GetResult<Prisma.$PayoutRequestPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many PayoutRequests.
     * @param {PayoutRequestCreateManyArgs} args - Arguments to create many PayoutRequests.
     * @example
     * // Create many PayoutRequests
     * const payoutRequest = await prisma.payoutRequest.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PayoutRequestCreateManyArgs>(args?: SelectSubset<T, PayoutRequestCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many PayoutRequests and returns the data saved in the database.
     * @param {PayoutRequestCreateManyAndReturnArgs} args - Arguments to create many PayoutRequests.
     * @example
     * // Create many PayoutRequests
     * const payoutRequest = await prisma.payoutRequest.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many PayoutRequests and only return the `id`
     * const payoutRequestWithIdOnly = await prisma.payoutRequest.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends PayoutRequestCreateManyAndReturnArgs>(args?: SelectSubset<T, PayoutRequestCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PayoutRequestPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a PayoutRequest.
     * @param {PayoutRequestDeleteArgs} args - Arguments to delete one PayoutRequest.
     * @example
     * // Delete one PayoutRequest
     * const PayoutRequest = await prisma.payoutRequest.delete({
     *   where: {
     *     // ... filter to delete one PayoutRequest
     *   }
     * })
     * 
     */
    delete<T extends PayoutRequestDeleteArgs>(args: SelectSubset<T, PayoutRequestDeleteArgs<ExtArgs>>): Prisma__PayoutRequestClient<$Result.GetResult<Prisma.$PayoutRequestPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one PayoutRequest.
     * @param {PayoutRequestUpdateArgs} args - Arguments to update one PayoutRequest.
     * @example
     * // Update one PayoutRequest
     * const payoutRequest = await prisma.payoutRequest.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PayoutRequestUpdateArgs>(args: SelectSubset<T, PayoutRequestUpdateArgs<ExtArgs>>): Prisma__PayoutRequestClient<$Result.GetResult<Prisma.$PayoutRequestPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more PayoutRequests.
     * @param {PayoutRequestDeleteManyArgs} args - Arguments to filter PayoutRequests to delete.
     * @example
     * // Delete a few PayoutRequests
     * const { count } = await prisma.payoutRequest.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PayoutRequestDeleteManyArgs>(args?: SelectSubset<T, PayoutRequestDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PayoutRequests.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PayoutRequestUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PayoutRequests
     * const payoutRequest = await prisma.payoutRequest.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PayoutRequestUpdateManyArgs>(args: SelectSubset<T, PayoutRequestUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one PayoutRequest.
     * @param {PayoutRequestUpsertArgs} args - Arguments to update or create a PayoutRequest.
     * @example
     * // Update or create a PayoutRequest
     * const payoutRequest = await prisma.payoutRequest.upsert({
     *   create: {
     *     // ... data to create a PayoutRequest
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PayoutRequest we want to update
     *   }
     * })
     */
    upsert<T extends PayoutRequestUpsertArgs>(args: SelectSubset<T, PayoutRequestUpsertArgs<ExtArgs>>): Prisma__PayoutRequestClient<$Result.GetResult<Prisma.$PayoutRequestPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of PayoutRequests.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PayoutRequestCountArgs} args - Arguments to filter PayoutRequests to count.
     * @example
     * // Count the number of PayoutRequests
     * const count = await prisma.payoutRequest.count({
     *   where: {
     *     // ... the filter for the PayoutRequests we want to count
     *   }
     * })
    **/
    count<T extends PayoutRequestCountArgs>(
      args?: Subset<T, PayoutRequestCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PayoutRequestCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PayoutRequest.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PayoutRequestAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PayoutRequestAggregateArgs>(args: Subset<T, PayoutRequestAggregateArgs>): Prisma.PrismaPromise<GetPayoutRequestAggregateType<T>>

    /**
     * Group by PayoutRequest.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PayoutRequestGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PayoutRequestGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PayoutRequestGroupByArgs['orderBy'] }
        : { orderBy?: PayoutRequestGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PayoutRequestGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPayoutRequestGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PayoutRequest model
   */
  readonly fields: PayoutRequestFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PayoutRequest.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PayoutRequestClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    agency<T extends AgencyProfileDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AgencyProfileDefaultArgs<ExtArgs>>): Prisma__AgencyProfileClient<$Result.GetResult<Prisma.$AgencyProfilePayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PayoutRequest model
   */ 
  interface PayoutRequestFieldRefs {
    readonly id: FieldRef<"PayoutRequest", 'String'>
    readonly agencyId: FieldRef<"PayoutRequest", 'String'>
    readonly amount: FieldRef<"PayoutRequest", 'Float'>
    readonly status: FieldRef<"PayoutRequest", 'PayoutStatus'>
    readonly requestedAt: FieldRef<"PayoutRequest", 'DateTime'>
    readonly processedAt: FieldRef<"PayoutRequest", 'DateTime'>
    readonly bankDetails: FieldRef<"PayoutRequest", 'String'>
  }
    

  // Custom InputTypes
  /**
   * PayoutRequest findUnique
   */
  export type PayoutRequestFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PayoutRequest
     */
    select?: PayoutRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayoutRequestInclude<ExtArgs> | null
    /**
     * Filter, which PayoutRequest to fetch.
     */
    where: PayoutRequestWhereUniqueInput
  }

  /**
   * PayoutRequest findUniqueOrThrow
   */
  export type PayoutRequestFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PayoutRequest
     */
    select?: PayoutRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayoutRequestInclude<ExtArgs> | null
    /**
     * Filter, which PayoutRequest to fetch.
     */
    where: PayoutRequestWhereUniqueInput
  }

  /**
   * PayoutRequest findFirst
   */
  export type PayoutRequestFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PayoutRequest
     */
    select?: PayoutRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayoutRequestInclude<ExtArgs> | null
    /**
     * Filter, which PayoutRequest to fetch.
     */
    where?: PayoutRequestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PayoutRequests to fetch.
     */
    orderBy?: PayoutRequestOrderByWithRelationInput | PayoutRequestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PayoutRequests.
     */
    cursor?: PayoutRequestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PayoutRequests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PayoutRequests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PayoutRequests.
     */
    distinct?: PayoutRequestScalarFieldEnum | PayoutRequestScalarFieldEnum[]
  }

  /**
   * PayoutRequest findFirstOrThrow
   */
  export type PayoutRequestFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PayoutRequest
     */
    select?: PayoutRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayoutRequestInclude<ExtArgs> | null
    /**
     * Filter, which PayoutRequest to fetch.
     */
    where?: PayoutRequestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PayoutRequests to fetch.
     */
    orderBy?: PayoutRequestOrderByWithRelationInput | PayoutRequestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PayoutRequests.
     */
    cursor?: PayoutRequestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PayoutRequests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PayoutRequests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PayoutRequests.
     */
    distinct?: PayoutRequestScalarFieldEnum | PayoutRequestScalarFieldEnum[]
  }

  /**
   * PayoutRequest findMany
   */
  export type PayoutRequestFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PayoutRequest
     */
    select?: PayoutRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayoutRequestInclude<ExtArgs> | null
    /**
     * Filter, which PayoutRequests to fetch.
     */
    where?: PayoutRequestWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PayoutRequests to fetch.
     */
    orderBy?: PayoutRequestOrderByWithRelationInput | PayoutRequestOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PayoutRequests.
     */
    cursor?: PayoutRequestWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PayoutRequests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PayoutRequests.
     */
    skip?: number
    distinct?: PayoutRequestScalarFieldEnum | PayoutRequestScalarFieldEnum[]
  }

  /**
   * PayoutRequest create
   */
  export type PayoutRequestCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PayoutRequest
     */
    select?: PayoutRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayoutRequestInclude<ExtArgs> | null
    /**
     * The data needed to create a PayoutRequest.
     */
    data: XOR<PayoutRequestCreateInput, PayoutRequestUncheckedCreateInput>
  }

  /**
   * PayoutRequest createMany
   */
  export type PayoutRequestCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PayoutRequests.
     */
    data: PayoutRequestCreateManyInput | PayoutRequestCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PayoutRequest createManyAndReturn
   */
  export type PayoutRequestCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PayoutRequest
     */
    select?: PayoutRequestSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many PayoutRequests.
     */
    data: PayoutRequestCreateManyInput | PayoutRequestCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayoutRequestIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * PayoutRequest update
   */
  export type PayoutRequestUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PayoutRequest
     */
    select?: PayoutRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayoutRequestInclude<ExtArgs> | null
    /**
     * The data needed to update a PayoutRequest.
     */
    data: XOR<PayoutRequestUpdateInput, PayoutRequestUncheckedUpdateInput>
    /**
     * Choose, which PayoutRequest to update.
     */
    where: PayoutRequestWhereUniqueInput
  }

  /**
   * PayoutRequest updateMany
   */
  export type PayoutRequestUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PayoutRequests.
     */
    data: XOR<PayoutRequestUpdateManyMutationInput, PayoutRequestUncheckedUpdateManyInput>
    /**
     * Filter which PayoutRequests to update
     */
    where?: PayoutRequestWhereInput
  }

  /**
   * PayoutRequest upsert
   */
  export type PayoutRequestUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PayoutRequest
     */
    select?: PayoutRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayoutRequestInclude<ExtArgs> | null
    /**
     * The filter to search for the PayoutRequest to update in case it exists.
     */
    where: PayoutRequestWhereUniqueInput
    /**
     * In case the PayoutRequest found by the `where` argument doesn't exist, create a new PayoutRequest with this data.
     */
    create: XOR<PayoutRequestCreateInput, PayoutRequestUncheckedCreateInput>
    /**
     * In case the PayoutRequest was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PayoutRequestUpdateInput, PayoutRequestUncheckedUpdateInput>
  }

  /**
   * PayoutRequest delete
   */
  export type PayoutRequestDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PayoutRequest
     */
    select?: PayoutRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayoutRequestInclude<ExtArgs> | null
    /**
     * Filter which PayoutRequest to delete.
     */
    where: PayoutRequestWhereUniqueInput
  }

  /**
   * PayoutRequest deleteMany
   */
  export type PayoutRequestDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PayoutRequests to delete
     */
    where?: PayoutRequestWhereInput
  }

  /**
   * PayoutRequest without action
   */
  export type PayoutRequestDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PayoutRequest
     */
    select?: PayoutRequestSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: PayoutRequestInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    name: 'name',
    email: 'email',
    password: 'password',
    role: 'role',
    avatar: 'avatar',
    isEmailVerified: 'isEmailVerified',
    otp: 'otp',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const AgencyProfileScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    companyName: 'companyName',
    ice: 'ice',
    patente: 'patente',
    rib: 'rib',
    verificationStatus: 'verificationStatus',
    bio: 'bio',
    logo: 'logo',
    subscriptionStatus: 'subscriptionStatus',
    trialEndsAt: 'trialEndsAt',
    subscriptionEndsAt: 'subscriptionEndsAt'
  };

  export type AgencyProfileScalarFieldEnum = (typeof AgencyProfileScalarFieldEnum)[keyof typeof AgencyProfileScalarFieldEnum]


  export const TripTemplateScalarFieldEnum: {
    id: 'id',
    agencyId: 'agencyId',
    title: 'title',
    description: 'description',
    category: 'category',
    startLocation: 'startLocation',
    durationDays: 'durationDays',
    durationNights: 'durationNights',
    inclusions: 'inclusions',
    exclusions: 'exclusions',
    checklist: 'checklist',
    images: 'images',
    status: 'status',
    featured: 'featured',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type TripTemplateScalarFieldEnum = (typeof TripTemplateScalarFieldEnum)[keyof typeof TripTemplateScalarFieldEnum]


  export const ItineraryDayScalarFieldEnum: {
    id: 'id',
    templateId: 'templateId',
    dayNumber: 'dayNumber',
    title: 'title',
    description: 'description',
    activities: 'activities'
  };

  export type ItineraryDayScalarFieldEnum = (typeof ItineraryDayScalarFieldEnum)[keyof typeof ItineraryDayScalarFieldEnum]


  export const TripSessionScalarFieldEnum: {
    id: 'id',
    templateId: 'templateId',
    startDate: 'startDate',
    endDate: 'endDate',
    price: 'price',
    deposit: 'deposit',
    totalSeats: 'totalSeats',
    availableSeats: 'availableSeats',
    status: 'status'
  };

  export type TripSessionScalarFieldEnum = (typeof TripSessionScalarFieldEnum)[keyof typeof TripSessionScalarFieldEnum]


  export const BookingScalarFieldEnum: {
    id: 'id',
    sessionId: 'sessionId',
    travelerId: 'travelerId',
    bookingDate: 'bookingDate',
    status: 'status',
    totalAmount: 'totalAmount',
    guestsCount: 'guestsCount',
    paymentProofId: 'paymentProofId'
  };

  export type BookingScalarFieldEnum = (typeof BookingScalarFieldEnum)[keyof typeof BookingScalarFieldEnum]


  export const PaymentProofScalarFieldEnum: {
    id: 'id',
    bookingId: 'bookingId',
    imageUrl: 'imageUrl',
    uploadedAt: 'uploadedAt',
    status: 'status'
  };

  export type PaymentProofScalarFieldEnum = (typeof PaymentProofScalarFieldEnum)[keyof typeof PaymentProofScalarFieldEnum]


  export const WalletScalarFieldEnum: {
    id: 'id',
    agencyId: 'agencyId',
    availableBalance: 'availableBalance',
    pendingBalance: 'pendingBalance'
  };

  export type WalletScalarFieldEnum = (typeof WalletScalarFieldEnum)[keyof typeof WalletScalarFieldEnum]


  export const WalletTransactionScalarFieldEnum: {
    id: 'id',
    walletId: 'walletId',
    amount: 'amount',
    type: 'type',
    reason: 'reason',
    createdAt: 'createdAt'
  };

  export type WalletTransactionScalarFieldEnum = (typeof WalletTransactionScalarFieldEnum)[keyof typeof WalletTransactionScalarFieldEnum]


  export const PayoutRequestScalarFieldEnum: {
    id: 'id',
    agencyId: 'agencyId',
    amount: 'amount',
    status: 'status',
    requestedAt: 'requestedAt',
    processedAt: 'processedAt',
    bankDetails: 'bankDetails'
  };

  export type PayoutRequestScalarFieldEnum = (typeof PayoutRequestScalarFieldEnum)[keyof typeof PayoutRequestScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'UserRole'
   */
  export type EnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole'>
    


  /**
   * Reference to a field of type 'UserRole[]'
   */
  export type ListEnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'VerificationStatus'
   */
  export type EnumVerificationStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'VerificationStatus'>
    


  /**
   * Reference to a field of type 'VerificationStatus[]'
   */
  export type ListEnumVerificationStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'VerificationStatus[]'>
    


  /**
   * Reference to a field of type 'SubscriptionStatus'
   */
  export type EnumSubscriptionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubscriptionStatus'>
    


  /**
   * Reference to a field of type 'SubscriptionStatus[]'
   */
  export type ListEnumSubscriptionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubscriptionStatus[]'>
    


  /**
   * Reference to a field of type 'TripCategory'
   */
  export type EnumTripCategoryFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TripCategory'>
    


  /**
   * Reference to a field of type 'TripCategory[]'
   */
  export type ListEnumTripCategoryFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TripCategory[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'TripStatus'
   */
  export type EnumTripStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TripStatus'>
    


  /**
   * Reference to a field of type 'TripStatus[]'
   */
  export type ListEnumTripStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TripStatus[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'BookingStatus'
   */
  export type EnumBookingStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BookingStatus'>
    


  /**
   * Reference to a field of type 'BookingStatus[]'
   */
  export type ListEnumBookingStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BookingStatus[]'>
    


  /**
   * Reference to a field of type 'TransactionType'
   */
  export type EnumTransactionTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TransactionType'>
    


  /**
   * Reference to a field of type 'TransactionType[]'
   */
  export type ListEnumTransactionTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TransactionType[]'>
    


  /**
   * Reference to a field of type 'PayoutStatus'
   */
  export type EnumPayoutStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PayoutStatus'>
    


  /**
   * Reference to a field of type 'PayoutStatus[]'
   */
  export type ListEnumPayoutStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'PayoutStatus[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: StringFilter<"User"> | string
    name?: StringNullableFilter<"User"> | string | null
    email?: StringFilter<"User"> | string
    password?: StringFilter<"User"> | string
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    avatar?: StringNullableFilter<"User"> | string | null
    isEmailVerified?: BoolFilter<"User"> | boolean
    otp?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    agencyProfile?: XOR<AgencyProfileNullableRelationFilter, AgencyProfileWhereInput> | null
    bookings?: BookingListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrderInput | SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    avatar?: SortOrderInput | SortOrder
    isEmailVerified?: SortOrder
    otp?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    agencyProfile?: AgencyProfileOrderByWithRelationInput
    bookings?: BookingOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    name?: StringNullableFilter<"User"> | string | null
    password?: StringFilter<"User"> | string
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    avatar?: StringNullableFilter<"User"> | string | null
    isEmailVerified?: BoolFilter<"User"> | boolean
    otp?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    agencyProfile?: XOR<AgencyProfileNullableRelationFilter, AgencyProfileWhereInput> | null
    bookings?: BookingListRelationFilter
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrderInput | SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    avatar?: SortOrderInput | SortOrder
    isEmailVerified?: SortOrder
    otp?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"User"> | string
    name?: StringNullableWithAggregatesFilter<"User"> | string | null
    email?: StringWithAggregatesFilter<"User"> | string
    password?: StringWithAggregatesFilter<"User"> | string
    role?: EnumUserRoleWithAggregatesFilter<"User"> | $Enums.UserRole
    avatar?: StringNullableWithAggregatesFilter<"User"> | string | null
    isEmailVerified?: BoolWithAggregatesFilter<"User"> | boolean
    otp?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type AgencyProfileWhereInput = {
    AND?: AgencyProfileWhereInput | AgencyProfileWhereInput[]
    OR?: AgencyProfileWhereInput[]
    NOT?: AgencyProfileWhereInput | AgencyProfileWhereInput[]
    id?: StringFilter<"AgencyProfile"> | string
    userId?: StringFilter<"AgencyProfile"> | string
    companyName?: StringFilter<"AgencyProfile"> | string
    ice?: StringFilter<"AgencyProfile"> | string
    patente?: StringFilter<"AgencyProfile"> | string
    rib?: StringFilter<"AgencyProfile"> | string
    verificationStatus?: EnumVerificationStatusFilter<"AgencyProfile"> | $Enums.VerificationStatus
    bio?: StringNullableFilter<"AgencyProfile"> | string | null
    logo?: StringNullableFilter<"AgencyProfile"> | string | null
    subscriptionStatus?: EnumSubscriptionStatusFilter<"AgencyProfile"> | $Enums.SubscriptionStatus
    trialEndsAt?: DateTimeNullableFilter<"AgencyProfile"> | Date | string | null
    subscriptionEndsAt?: DateTimeNullableFilter<"AgencyProfile"> | Date | string | null
    user?: XOR<UserRelationFilter, UserWhereInput>
    templates?: TripTemplateListRelationFilter
    wallet?: XOR<WalletNullableRelationFilter, WalletWhereInput> | null
    payoutRequests?: PayoutRequestListRelationFilter
  }

  export type AgencyProfileOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    companyName?: SortOrder
    ice?: SortOrder
    patente?: SortOrder
    rib?: SortOrder
    verificationStatus?: SortOrder
    bio?: SortOrderInput | SortOrder
    logo?: SortOrderInput | SortOrder
    subscriptionStatus?: SortOrder
    trialEndsAt?: SortOrderInput | SortOrder
    subscriptionEndsAt?: SortOrderInput | SortOrder
    user?: UserOrderByWithRelationInput
    templates?: TripTemplateOrderByRelationAggregateInput
    wallet?: WalletOrderByWithRelationInput
    payoutRequests?: PayoutRequestOrderByRelationAggregateInput
  }

  export type AgencyProfileWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userId?: string
    ice?: string
    AND?: AgencyProfileWhereInput | AgencyProfileWhereInput[]
    OR?: AgencyProfileWhereInput[]
    NOT?: AgencyProfileWhereInput | AgencyProfileWhereInput[]
    companyName?: StringFilter<"AgencyProfile"> | string
    patente?: StringFilter<"AgencyProfile"> | string
    rib?: StringFilter<"AgencyProfile"> | string
    verificationStatus?: EnumVerificationStatusFilter<"AgencyProfile"> | $Enums.VerificationStatus
    bio?: StringNullableFilter<"AgencyProfile"> | string | null
    logo?: StringNullableFilter<"AgencyProfile"> | string | null
    subscriptionStatus?: EnumSubscriptionStatusFilter<"AgencyProfile"> | $Enums.SubscriptionStatus
    trialEndsAt?: DateTimeNullableFilter<"AgencyProfile"> | Date | string | null
    subscriptionEndsAt?: DateTimeNullableFilter<"AgencyProfile"> | Date | string | null
    user?: XOR<UserRelationFilter, UserWhereInput>
    templates?: TripTemplateListRelationFilter
    wallet?: XOR<WalletNullableRelationFilter, WalletWhereInput> | null
    payoutRequests?: PayoutRequestListRelationFilter
  }, "id" | "userId" | "ice">

  export type AgencyProfileOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    companyName?: SortOrder
    ice?: SortOrder
    patente?: SortOrder
    rib?: SortOrder
    verificationStatus?: SortOrder
    bio?: SortOrderInput | SortOrder
    logo?: SortOrderInput | SortOrder
    subscriptionStatus?: SortOrder
    trialEndsAt?: SortOrderInput | SortOrder
    subscriptionEndsAt?: SortOrderInput | SortOrder
    _count?: AgencyProfileCountOrderByAggregateInput
    _max?: AgencyProfileMaxOrderByAggregateInput
    _min?: AgencyProfileMinOrderByAggregateInput
  }

  export type AgencyProfileScalarWhereWithAggregatesInput = {
    AND?: AgencyProfileScalarWhereWithAggregatesInput | AgencyProfileScalarWhereWithAggregatesInput[]
    OR?: AgencyProfileScalarWhereWithAggregatesInput[]
    NOT?: AgencyProfileScalarWhereWithAggregatesInput | AgencyProfileScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AgencyProfile"> | string
    userId?: StringWithAggregatesFilter<"AgencyProfile"> | string
    companyName?: StringWithAggregatesFilter<"AgencyProfile"> | string
    ice?: StringWithAggregatesFilter<"AgencyProfile"> | string
    patente?: StringWithAggregatesFilter<"AgencyProfile"> | string
    rib?: StringWithAggregatesFilter<"AgencyProfile"> | string
    verificationStatus?: EnumVerificationStatusWithAggregatesFilter<"AgencyProfile"> | $Enums.VerificationStatus
    bio?: StringNullableWithAggregatesFilter<"AgencyProfile"> | string | null
    logo?: StringNullableWithAggregatesFilter<"AgencyProfile"> | string | null
    subscriptionStatus?: EnumSubscriptionStatusWithAggregatesFilter<"AgencyProfile"> | $Enums.SubscriptionStatus
    trialEndsAt?: DateTimeNullableWithAggregatesFilter<"AgencyProfile"> | Date | string | null
    subscriptionEndsAt?: DateTimeNullableWithAggregatesFilter<"AgencyProfile"> | Date | string | null
  }

  export type TripTemplateWhereInput = {
    AND?: TripTemplateWhereInput | TripTemplateWhereInput[]
    OR?: TripTemplateWhereInput[]
    NOT?: TripTemplateWhereInput | TripTemplateWhereInput[]
    id?: StringFilter<"TripTemplate"> | string
    agencyId?: StringFilter<"TripTemplate"> | string
    title?: StringFilter<"TripTemplate"> | string
    description?: StringFilter<"TripTemplate"> | string
    category?: EnumTripCategoryFilter<"TripTemplate"> | $Enums.TripCategory
    startLocation?: StringFilter<"TripTemplate"> | string
    durationDays?: IntFilter<"TripTemplate"> | number
    durationNights?: IntFilter<"TripTemplate"> | number
    inclusions?: StringNullableListFilter<"TripTemplate">
    exclusions?: StringNullableListFilter<"TripTemplate">
    checklist?: StringNullableListFilter<"TripTemplate">
    images?: StringNullableListFilter<"TripTemplate">
    status?: EnumTripStatusFilter<"TripTemplate"> | $Enums.TripStatus
    featured?: BoolFilter<"TripTemplate"> | boolean
    createdAt?: DateTimeFilter<"TripTemplate"> | Date | string
    updatedAt?: DateTimeFilter<"TripTemplate"> | Date | string
    agency?: XOR<AgencyProfileRelationFilter, AgencyProfileWhereInput>
    sessions?: TripSessionListRelationFilter
    itinerary?: ItineraryDayListRelationFilter
  }

  export type TripTemplateOrderByWithRelationInput = {
    id?: SortOrder
    agencyId?: SortOrder
    title?: SortOrder
    description?: SortOrder
    category?: SortOrder
    startLocation?: SortOrder
    durationDays?: SortOrder
    durationNights?: SortOrder
    inclusions?: SortOrder
    exclusions?: SortOrder
    checklist?: SortOrder
    images?: SortOrder
    status?: SortOrder
    featured?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    agency?: AgencyProfileOrderByWithRelationInput
    sessions?: TripSessionOrderByRelationAggregateInput
    itinerary?: ItineraryDayOrderByRelationAggregateInput
  }

  export type TripTemplateWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TripTemplateWhereInput | TripTemplateWhereInput[]
    OR?: TripTemplateWhereInput[]
    NOT?: TripTemplateWhereInput | TripTemplateWhereInput[]
    agencyId?: StringFilter<"TripTemplate"> | string
    title?: StringFilter<"TripTemplate"> | string
    description?: StringFilter<"TripTemplate"> | string
    category?: EnumTripCategoryFilter<"TripTemplate"> | $Enums.TripCategory
    startLocation?: StringFilter<"TripTemplate"> | string
    durationDays?: IntFilter<"TripTemplate"> | number
    durationNights?: IntFilter<"TripTemplate"> | number
    inclusions?: StringNullableListFilter<"TripTemplate">
    exclusions?: StringNullableListFilter<"TripTemplate">
    checklist?: StringNullableListFilter<"TripTemplate">
    images?: StringNullableListFilter<"TripTemplate">
    status?: EnumTripStatusFilter<"TripTemplate"> | $Enums.TripStatus
    featured?: BoolFilter<"TripTemplate"> | boolean
    createdAt?: DateTimeFilter<"TripTemplate"> | Date | string
    updatedAt?: DateTimeFilter<"TripTemplate"> | Date | string
    agency?: XOR<AgencyProfileRelationFilter, AgencyProfileWhereInput>
    sessions?: TripSessionListRelationFilter
    itinerary?: ItineraryDayListRelationFilter
  }, "id">

  export type TripTemplateOrderByWithAggregationInput = {
    id?: SortOrder
    agencyId?: SortOrder
    title?: SortOrder
    description?: SortOrder
    category?: SortOrder
    startLocation?: SortOrder
    durationDays?: SortOrder
    durationNights?: SortOrder
    inclusions?: SortOrder
    exclusions?: SortOrder
    checklist?: SortOrder
    images?: SortOrder
    status?: SortOrder
    featured?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: TripTemplateCountOrderByAggregateInput
    _avg?: TripTemplateAvgOrderByAggregateInput
    _max?: TripTemplateMaxOrderByAggregateInput
    _min?: TripTemplateMinOrderByAggregateInput
    _sum?: TripTemplateSumOrderByAggregateInput
  }

  export type TripTemplateScalarWhereWithAggregatesInput = {
    AND?: TripTemplateScalarWhereWithAggregatesInput | TripTemplateScalarWhereWithAggregatesInput[]
    OR?: TripTemplateScalarWhereWithAggregatesInput[]
    NOT?: TripTemplateScalarWhereWithAggregatesInput | TripTemplateScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"TripTemplate"> | string
    agencyId?: StringWithAggregatesFilter<"TripTemplate"> | string
    title?: StringWithAggregatesFilter<"TripTemplate"> | string
    description?: StringWithAggregatesFilter<"TripTemplate"> | string
    category?: EnumTripCategoryWithAggregatesFilter<"TripTemplate"> | $Enums.TripCategory
    startLocation?: StringWithAggregatesFilter<"TripTemplate"> | string
    durationDays?: IntWithAggregatesFilter<"TripTemplate"> | number
    durationNights?: IntWithAggregatesFilter<"TripTemplate"> | number
    inclusions?: StringNullableListFilter<"TripTemplate">
    exclusions?: StringNullableListFilter<"TripTemplate">
    checklist?: StringNullableListFilter<"TripTemplate">
    images?: StringNullableListFilter<"TripTemplate">
    status?: EnumTripStatusWithAggregatesFilter<"TripTemplate"> | $Enums.TripStatus
    featured?: BoolWithAggregatesFilter<"TripTemplate"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"TripTemplate"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"TripTemplate"> | Date | string
  }

  export type ItineraryDayWhereInput = {
    AND?: ItineraryDayWhereInput | ItineraryDayWhereInput[]
    OR?: ItineraryDayWhereInput[]
    NOT?: ItineraryDayWhereInput | ItineraryDayWhereInput[]
    id?: StringFilter<"ItineraryDay"> | string
    templateId?: StringFilter<"ItineraryDay"> | string
    dayNumber?: IntFilter<"ItineraryDay"> | number
    title?: StringNullableFilter<"ItineraryDay"> | string | null
    description?: StringFilter<"ItineraryDay"> | string
    activities?: StringNullableListFilter<"ItineraryDay">
    template?: XOR<TripTemplateRelationFilter, TripTemplateWhereInput>
  }

  export type ItineraryDayOrderByWithRelationInput = {
    id?: SortOrder
    templateId?: SortOrder
    dayNumber?: SortOrder
    title?: SortOrderInput | SortOrder
    description?: SortOrder
    activities?: SortOrder
    template?: TripTemplateOrderByWithRelationInput
  }

  export type ItineraryDayWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ItineraryDayWhereInput | ItineraryDayWhereInput[]
    OR?: ItineraryDayWhereInput[]
    NOT?: ItineraryDayWhereInput | ItineraryDayWhereInput[]
    templateId?: StringFilter<"ItineraryDay"> | string
    dayNumber?: IntFilter<"ItineraryDay"> | number
    title?: StringNullableFilter<"ItineraryDay"> | string | null
    description?: StringFilter<"ItineraryDay"> | string
    activities?: StringNullableListFilter<"ItineraryDay">
    template?: XOR<TripTemplateRelationFilter, TripTemplateWhereInput>
  }, "id">

  export type ItineraryDayOrderByWithAggregationInput = {
    id?: SortOrder
    templateId?: SortOrder
    dayNumber?: SortOrder
    title?: SortOrderInput | SortOrder
    description?: SortOrder
    activities?: SortOrder
    _count?: ItineraryDayCountOrderByAggregateInput
    _avg?: ItineraryDayAvgOrderByAggregateInput
    _max?: ItineraryDayMaxOrderByAggregateInput
    _min?: ItineraryDayMinOrderByAggregateInput
    _sum?: ItineraryDaySumOrderByAggregateInput
  }

  export type ItineraryDayScalarWhereWithAggregatesInput = {
    AND?: ItineraryDayScalarWhereWithAggregatesInput | ItineraryDayScalarWhereWithAggregatesInput[]
    OR?: ItineraryDayScalarWhereWithAggregatesInput[]
    NOT?: ItineraryDayScalarWhereWithAggregatesInput | ItineraryDayScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ItineraryDay"> | string
    templateId?: StringWithAggregatesFilter<"ItineraryDay"> | string
    dayNumber?: IntWithAggregatesFilter<"ItineraryDay"> | number
    title?: StringNullableWithAggregatesFilter<"ItineraryDay"> | string | null
    description?: StringWithAggregatesFilter<"ItineraryDay"> | string
    activities?: StringNullableListFilter<"ItineraryDay">
  }

  export type TripSessionWhereInput = {
    AND?: TripSessionWhereInput | TripSessionWhereInput[]
    OR?: TripSessionWhereInput[]
    NOT?: TripSessionWhereInput | TripSessionWhereInput[]
    id?: StringFilter<"TripSession"> | string
    templateId?: StringFilter<"TripSession"> | string
    startDate?: DateTimeFilter<"TripSession"> | Date | string
    endDate?: DateTimeFilter<"TripSession"> | Date | string
    price?: FloatFilter<"TripSession"> | number
    deposit?: FloatFilter<"TripSession"> | number
    totalSeats?: IntFilter<"TripSession"> | number
    availableSeats?: IntFilter<"TripSession"> | number
    status?: StringFilter<"TripSession"> | string
    template?: XOR<TripTemplateRelationFilter, TripTemplateWhereInput>
    bookings?: BookingListRelationFilter
  }

  export type TripSessionOrderByWithRelationInput = {
    id?: SortOrder
    templateId?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    price?: SortOrder
    deposit?: SortOrder
    totalSeats?: SortOrder
    availableSeats?: SortOrder
    status?: SortOrder
    template?: TripTemplateOrderByWithRelationInput
    bookings?: BookingOrderByRelationAggregateInput
  }

  export type TripSessionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: TripSessionWhereInput | TripSessionWhereInput[]
    OR?: TripSessionWhereInput[]
    NOT?: TripSessionWhereInput | TripSessionWhereInput[]
    templateId?: StringFilter<"TripSession"> | string
    startDate?: DateTimeFilter<"TripSession"> | Date | string
    endDate?: DateTimeFilter<"TripSession"> | Date | string
    price?: FloatFilter<"TripSession"> | number
    deposit?: FloatFilter<"TripSession"> | number
    totalSeats?: IntFilter<"TripSession"> | number
    availableSeats?: IntFilter<"TripSession"> | number
    status?: StringFilter<"TripSession"> | string
    template?: XOR<TripTemplateRelationFilter, TripTemplateWhereInput>
    bookings?: BookingListRelationFilter
  }, "id">

  export type TripSessionOrderByWithAggregationInput = {
    id?: SortOrder
    templateId?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    price?: SortOrder
    deposit?: SortOrder
    totalSeats?: SortOrder
    availableSeats?: SortOrder
    status?: SortOrder
    _count?: TripSessionCountOrderByAggregateInput
    _avg?: TripSessionAvgOrderByAggregateInput
    _max?: TripSessionMaxOrderByAggregateInput
    _min?: TripSessionMinOrderByAggregateInput
    _sum?: TripSessionSumOrderByAggregateInput
  }

  export type TripSessionScalarWhereWithAggregatesInput = {
    AND?: TripSessionScalarWhereWithAggregatesInput | TripSessionScalarWhereWithAggregatesInput[]
    OR?: TripSessionScalarWhereWithAggregatesInput[]
    NOT?: TripSessionScalarWhereWithAggregatesInput | TripSessionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"TripSession"> | string
    templateId?: StringWithAggregatesFilter<"TripSession"> | string
    startDate?: DateTimeWithAggregatesFilter<"TripSession"> | Date | string
    endDate?: DateTimeWithAggregatesFilter<"TripSession"> | Date | string
    price?: FloatWithAggregatesFilter<"TripSession"> | number
    deposit?: FloatWithAggregatesFilter<"TripSession"> | number
    totalSeats?: IntWithAggregatesFilter<"TripSession"> | number
    availableSeats?: IntWithAggregatesFilter<"TripSession"> | number
    status?: StringWithAggregatesFilter<"TripSession"> | string
  }

  export type BookingWhereInput = {
    AND?: BookingWhereInput | BookingWhereInput[]
    OR?: BookingWhereInput[]
    NOT?: BookingWhereInput | BookingWhereInput[]
    id?: StringFilter<"Booking"> | string
    sessionId?: StringFilter<"Booking"> | string
    travelerId?: StringFilter<"Booking"> | string
    bookingDate?: DateTimeFilter<"Booking"> | Date | string
    status?: EnumBookingStatusFilter<"Booking"> | $Enums.BookingStatus
    totalAmount?: FloatFilter<"Booking"> | number
    guestsCount?: IntFilter<"Booking"> | number
    paymentProofId?: StringNullableFilter<"Booking"> | string | null
    session?: XOR<TripSessionRelationFilter, TripSessionWhereInput>
    traveler?: XOR<UserRelationFilter, UserWhereInput>
    paymentProof?: XOR<PaymentProofNullableRelationFilter, PaymentProofWhereInput> | null
  }

  export type BookingOrderByWithRelationInput = {
    id?: SortOrder
    sessionId?: SortOrder
    travelerId?: SortOrder
    bookingDate?: SortOrder
    status?: SortOrder
    totalAmount?: SortOrder
    guestsCount?: SortOrder
    paymentProofId?: SortOrderInput | SortOrder
    session?: TripSessionOrderByWithRelationInput
    traveler?: UserOrderByWithRelationInput
    paymentProof?: PaymentProofOrderByWithRelationInput
  }

  export type BookingWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    paymentProofId?: string
    AND?: BookingWhereInput | BookingWhereInput[]
    OR?: BookingWhereInput[]
    NOT?: BookingWhereInput | BookingWhereInput[]
    sessionId?: StringFilter<"Booking"> | string
    travelerId?: StringFilter<"Booking"> | string
    bookingDate?: DateTimeFilter<"Booking"> | Date | string
    status?: EnumBookingStatusFilter<"Booking"> | $Enums.BookingStatus
    totalAmount?: FloatFilter<"Booking"> | number
    guestsCount?: IntFilter<"Booking"> | number
    session?: XOR<TripSessionRelationFilter, TripSessionWhereInput>
    traveler?: XOR<UserRelationFilter, UserWhereInput>
    paymentProof?: XOR<PaymentProofNullableRelationFilter, PaymentProofWhereInput> | null
  }, "id" | "paymentProofId">

  export type BookingOrderByWithAggregationInput = {
    id?: SortOrder
    sessionId?: SortOrder
    travelerId?: SortOrder
    bookingDate?: SortOrder
    status?: SortOrder
    totalAmount?: SortOrder
    guestsCount?: SortOrder
    paymentProofId?: SortOrderInput | SortOrder
    _count?: BookingCountOrderByAggregateInput
    _avg?: BookingAvgOrderByAggregateInput
    _max?: BookingMaxOrderByAggregateInput
    _min?: BookingMinOrderByAggregateInput
    _sum?: BookingSumOrderByAggregateInput
  }

  export type BookingScalarWhereWithAggregatesInput = {
    AND?: BookingScalarWhereWithAggregatesInput | BookingScalarWhereWithAggregatesInput[]
    OR?: BookingScalarWhereWithAggregatesInput[]
    NOT?: BookingScalarWhereWithAggregatesInput | BookingScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Booking"> | string
    sessionId?: StringWithAggregatesFilter<"Booking"> | string
    travelerId?: StringWithAggregatesFilter<"Booking"> | string
    bookingDate?: DateTimeWithAggregatesFilter<"Booking"> | Date | string
    status?: EnumBookingStatusWithAggregatesFilter<"Booking"> | $Enums.BookingStatus
    totalAmount?: FloatWithAggregatesFilter<"Booking"> | number
    guestsCount?: IntWithAggregatesFilter<"Booking"> | number
    paymentProofId?: StringNullableWithAggregatesFilter<"Booking"> | string | null
  }

  export type PaymentProofWhereInput = {
    AND?: PaymentProofWhereInput | PaymentProofWhereInput[]
    OR?: PaymentProofWhereInput[]
    NOT?: PaymentProofWhereInput | PaymentProofWhereInput[]
    id?: StringFilter<"PaymentProof"> | string
    bookingId?: StringFilter<"PaymentProof"> | string
    imageUrl?: StringFilter<"PaymentProof"> | string
    uploadedAt?: DateTimeFilter<"PaymentProof"> | Date | string
    status?: EnumVerificationStatusFilter<"PaymentProof"> | $Enums.VerificationStatus
    booking?: XOR<BookingRelationFilter, BookingWhereInput>
  }

  export type PaymentProofOrderByWithRelationInput = {
    id?: SortOrder
    bookingId?: SortOrder
    imageUrl?: SortOrder
    uploadedAt?: SortOrder
    status?: SortOrder
    booking?: BookingOrderByWithRelationInput
  }

  export type PaymentProofWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    bookingId?: string
    AND?: PaymentProofWhereInput | PaymentProofWhereInput[]
    OR?: PaymentProofWhereInput[]
    NOT?: PaymentProofWhereInput | PaymentProofWhereInput[]
    imageUrl?: StringFilter<"PaymentProof"> | string
    uploadedAt?: DateTimeFilter<"PaymentProof"> | Date | string
    status?: EnumVerificationStatusFilter<"PaymentProof"> | $Enums.VerificationStatus
    booking?: XOR<BookingRelationFilter, BookingWhereInput>
  }, "id" | "bookingId">

  export type PaymentProofOrderByWithAggregationInput = {
    id?: SortOrder
    bookingId?: SortOrder
    imageUrl?: SortOrder
    uploadedAt?: SortOrder
    status?: SortOrder
    _count?: PaymentProofCountOrderByAggregateInput
    _max?: PaymentProofMaxOrderByAggregateInput
    _min?: PaymentProofMinOrderByAggregateInput
  }

  export type PaymentProofScalarWhereWithAggregatesInput = {
    AND?: PaymentProofScalarWhereWithAggregatesInput | PaymentProofScalarWhereWithAggregatesInput[]
    OR?: PaymentProofScalarWhereWithAggregatesInput[]
    NOT?: PaymentProofScalarWhereWithAggregatesInput | PaymentProofScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"PaymentProof"> | string
    bookingId?: StringWithAggregatesFilter<"PaymentProof"> | string
    imageUrl?: StringWithAggregatesFilter<"PaymentProof"> | string
    uploadedAt?: DateTimeWithAggregatesFilter<"PaymentProof"> | Date | string
    status?: EnumVerificationStatusWithAggregatesFilter<"PaymentProof"> | $Enums.VerificationStatus
  }

  export type WalletWhereInput = {
    AND?: WalletWhereInput | WalletWhereInput[]
    OR?: WalletWhereInput[]
    NOT?: WalletWhereInput | WalletWhereInput[]
    id?: StringFilter<"Wallet"> | string
    agencyId?: StringFilter<"Wallet"> | string
    availableBalance?: FloatFilter<"Wallet"> | number
    pendingBalance?: FloatFilter<"Wallet"> | number
    agency?: XOR<AgencyProfileRelationFilter, AgencyProfileWhereInput>
    transactions?: WalletTransactionListRelationFilter
  }

  export type WalletOrderByWithRelationInput = {
    id?: SortOrder
    agencyId?: SortOrder
    availableBalance?: SortOrder
    pendingBalance?: SortOrder
    agency?: AgencyProfileOrderByWithRelationInput
    transactions?: WalletTransactionOrderByRelationAggregateInput
  }

  export type WalletWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    agencyId?: string
    AND?: WalletWhereInput | WalletWhereInput[]
    OR?: WalletWhereInput[]
    NOT?: WalletWhereInput | WalletWhereInput[]
    availableBalance?: FloatFilter<"Wallet"> | number
    pendingBalance?: FloatFilter<"Wallet"> | number
    agency?: XOR<AgencyProfileRelationFilter, AgencyProfileWhereInput>
    transactions?: WalletTransactionListRelationFilter
  }, "id" | "agencyId">

  export type WalletOrderByWithAggregationInput = {
    id?: SortOrder
    agencyId?: SortOrder
    availableBalance?: SortOrder
    pendingBalance?: SortOrder
    _count?: WalletCountOrderByAggregateInput
    _avg?: WalletAvgOrderByAggregateInput
    _max?: WalletMaxOrderByAggregateInput
    _min?: WalletMinOrderByAggregateInput
    _sum?: WalletSumOrderByAggregateInput
  }

  export type WalletScalarWhereWithAggregatesInput = {
    AND?: WalletScalarWhereWithAggregatesInput | WalletScalarWhereWithAggregatesInput[]
    OR?: WalletScalarWhereWithAggregatesInput[]
    NOT?: WalletScalarWhereWithAggregatesInput | WalletScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Wallet"> | string
    agencyId?: StringWithAggregatesFilter<"Wallet"> | string
    availableBalance?: FloatWithAggregatesFilter<"Wallet"> | number
    pendingBalance?: FloatWithAggregatesFilter<"Wallet"> | number
  }

  export type WalletTransactionWhereInput = {
    AND?: WalletTransactionWhereInput | WalletTransactionWhereInput[]
    OR?: WalletTransactionWhereInput[]
    NOT?: WalletTransactionWhereInput | WalletTransactionWhereInput[]
    id?: StringFilter<"WalletTransaction"> | string
    walletId?: StringFilter<"WalletTransaction"> | string
    amount?: FloatFilter<"WalletTransaction"> | number
    type?: EnumTransactionTypeFilter<"WalletTransaction"> | $Enums.TransactionType
    reason?: StringFilter<"WalletTransaction"> | string
    createdAt?: DateTimeFilter<"WalletTransaction"> | Date | string
    wallet?: XOR<WalletRelationFilter, WalletWhereInput>
  }

  export type WalletTransactionOrderByWithRelationInput = {
    id?: SortOrder
    walletId?: SortOrder
    amount?: SortOrder
    type?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
    wallet?: WalletOrderByWithRelationInput
  }

  export type WalletTransactionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: WalletTransactionWhereInput | WalletTransactionWhereInput[]
    OR?: WalletTransactionWhereInput[]
    NOT?: WalletTransactionWhereInput | WalletTransactionWhereInput[]
    walletId?: StringFilter<"WalletTransaction"> | string
    amount?: FloatFilter<"WalletTransaction"> | number
    type?: EnumTransactionTypeFilter<"WalletTransaction"> | $Enums.TransactionType
    reason?: StringFilter<"WalletTransaction"> | string
    createdAt?: DateTimeFilter<"WalletTransaction"> | Date | string
    wallet?: XOR<WalletRelationFilter, WalletWhereInput>
  }, "id">

  export type WalletTransactionOrderByWithAggregationInput = {
    id?: SortOrder
    walletId?: SortOrder
    amount?: SortOrder
    type?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
    _count?: WalletTransactionCountOrderByAggregateInput
    _avg?: WalletTransactionAvgOrderByAggregateInput
    _max?: WalletTransactionMaxOrderByAggregateInput
    _min?: WalletTransactionMinOrderByAggregateInput
    _sum?: WalletTransactionSumOrderByAggregateInput
  }

  export type WalletTransactionScalarWhereWithAggregatesInput = {
    AND?: WalletTransactionScalarWhereWithAggregatesInput | WalletTransactionScalarWhereWithAggregatesInput[]
    OR?: WalletTransactionScalarWhereWithAggregatesInput[]
    NOT?: WalletTransactionScalarWhereWithAggregatesInput | WalletTransactionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"WalletTransaction"> | string
    walletId?: StringWithAggregatesFilter<"WalletTransaction"> | string
    amount?: FloatWithAggregatesFilter<"WalletTransaction"> | number
    type?: EnumTransactionTypeWithAggregatesFilter<"WalletTransaction"> | $Enums.TransactionType
    reason?: StringWithAggregatesFilter<"WalletTransaction"> | string
    createdAt?: DateTimeWithAggregatesFilter<"WalletTransaction"> | Date | string
  }

  export type PayoutRequestWhereInput = {
    AND?: PayoutRequestWhereInput | PayoutRequestWhereInput[]
    OR?: PayoutRequestWhereInput[]
    NOT?: PayoutRequestWhereInput | PayoutRequestWhereInput[]
    id?: StringFilter<"PayoutRequest"> | string
    agencyId?: StringFilter<"PayoutRequest"> | string
    amount?: FloatFilter<"PayoutRequest"> | number
    status?: EnumPayoutStatusFilter<"PayoutRequest"> | $Enums.PayoutStatus
    requestedAt?: DateTimeFilter<"PayoutRequest"> | Date | string
    processedAt?: DateTimeNullableFilter<"PayoutRequest"> | Date | string | null
    bankDetails?: StringFilter<"PayoutRequest"> | string
    agency?: XOR<AgencyProfileRelationFilter, AgencyProfileWhereInput>
  }

  export type PayoutRequestOrderByWithRelationInput = {
    id?: SortOrder
    agencyId?: SortOrder
    amount?: SortOrder
    status?: SortOrder
    requestedAt?: SortOrder
    processedAt?: SortOrderInput | SortOrder
    bankDetails?: SortOrder
    agency?: AgencyProfileOrderByWithRelationInput
  }

  export type PayoutRequestWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: PayoutRequestWhereInput | PayoutRequestWhereInput[]
    OR?: PayoutRequestWhereInput[]
    NOT?: PayoutRequestWhereInput | PayoutRequestWhereInput[]
    agencyId?: StringFilter<"PayoutRequest"> | string
    amount?: FloatFilter<"PayoutRequest"> | number
    status?: EnumPayoutStatusFilter<"PayoutRequest"> | $Enums.PayoutStatus
    requestedAt?: DateTimeFilter<"PayoutRequest"> | Date | string
    processedAt?: DateTimeNullableFilter<"PayoutRequest"> | Date | string | null
    bankDetails?: StringFilter<"PayoutRequest"> | string
    agency?: XOR<AgencyProfileRelationFilter, AgencyProfileWhereInput>
  }, "id">

  export type PayoutRequestOrderByWithAggregationInput = {
    id?: SortOrder
    agencyId?: SortOrder
    amount?: SortOrder
    status?: SortOrder
    requestedAt?: SortOrder
    processedAt?: SortOrderInput | SortOrder
    bankDetails?: SortOrder
    _count?: PayoutRequestCountOrderByAggregateInput
    _avg?: PayoutRequestAvgOrderByAggregateInput
    _max?: PayoutRequestMaxOrderByAggregateInput
    _min?: PayoutRequestMinOrderByAggregateInput
    _sum?: PayoutRequestSumOrderByAggregateInput
  }

  export type PayoutRequestScalarWhereWithAggregatesInput = {
    AND?: PayoutRequestScalarWhereWithAggregatesInput | PayoutRequestScalarWhereWithAggregatesInput[]
    OR?: PayoutRequestScalarWhereWithAggregatesInput[]
    NOT?: PayoutRequestScalarWhereWithAggregatesInput | PayoutRequestScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"PayoutRequest"> | string
    agencyId?: StringWithAggregatesFilter<"PayoutRequest"> | string
    amount?: FloatWithAggregatesFilter<"PayoutRequest"> | number
    status?: EnumPayoutStatusWithAggregatesFilter<"PayoutRequest"> | $Enums.PayoutStatus
    requestedAt?: DateTimeWithAggregatesFilter<"PayoutRequest"> | Date | string
    processedAt?: DateTimeNullableWithAggregatesFilter<"PayoutRequest"> | Date | string | null
    bankDetails?: StringWithAggregatesFilter<"PayoutRequest"> | string
  }

  export type UserCreateInput = {
    id?: string
    name?: string | null
    email: string
    password: string
    role?: $Enums.UserRole
    avatar?: string | null
    isEmailVerified?: boolean
    otp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    agencyProfile?: AgencyProfileCreateNestedOneWithoutUserInput
    bookings?: BookingCreateNestedManyWithoutTravelerInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    name?: string | null
    email: string
    password: string
    role?: $Enums.UserRole
    avatar?: string | null
    isEmailVerified?: boolean
    otp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    agencyProfile?: AgencyProfileUncheckedCreateNestedOneWithoutUserInput
    bookings?: BookingUncheckedCreateNestedManyWithoutTravelerInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    avatar?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    otp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    agencyProfile?: AgencyProfileUpdateOneWithoutUserNestedInput
    bookings?: BookingUpdateManyWithoutTravelerNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    avatar?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    otp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    agencyProfile?: AgencyProfileUncheckedUpdateOneWithoutUserNestedInput
    bookings?: BookingUncheckedUpdateManyWithoutTravelerNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    name?: string | null
    email: string
    password: string
    role?: $Enums.UserRole
    avatar?: string | null
    isEmailVerified?: boolean
    otp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    avatar?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    otp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    avatar?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    otp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AgencyProfileCreateInput = {
    id?: string
    companyName: string
    ice: string
    patente: string
    rib: string
    verificationStatus?: $Enums.VerificationStatus
    bio?: string | null
    logo?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    trialEndsAt?: Date | string | null
    subscriptionEndsAt?: Date | string | null
    user: UserCreateNestedOneWithoutAgencyProfileInput
    templates?: TripTemplateCreateNestedManyWithoutAgencyInput
    wallet?: WalletCreateNestedOneWithoutAgencyInput
    payoutRequests?: PayoutRequestCreateNestedManyWithoutAgencyInput
  }

  export type AgencyProfileUncheckedCreateInput = {
    id?: string
    userId: string
    companyName: string
    ice: string
    patente: string
    rib: string
    verificationStatus?: $Enums.VerificationStatus
    bio?: string | null
    logo?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    trialEndsAt?: Date | string | null
    subscriptionEndsAt?: Date | string | null
    templates?: TripTemplateUncheckedCreateNestedManyWithoutAgencyInput
    wallet?: WalletUncheckedCreateNestedOneWithoutAgencyInput
    payoutRequests?: PayoutRequestUncheckedCreateNestedManyWithoutAgencyInput
  }

  export type AgencyProfileUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    ice?: StringFieldUpdateOperationsInput | string
    patente?: StringFieldUpdateOperationsInput | string
    rib?: StringFieldUpdateOperationsInput | string
    verificationStatus?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    logo?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subscriptionEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneRequiredWithoutAgencyProfileNestedInput
    templates?: TripTemplateUpdateManyWithoutAgencyNestedInput
    wallet?: WalletUpdateOneWithoutAgencyNestedInput
    payoutRequests?: PayoutRequestUpdateManyWithoutAgencyNestedInput
  }

  export type AgencyProfileUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    ice?: StringFieldUpdateOperationsInput | string
    patente?: StringFieldUpdateOperationsInput | string
    rib?: StringFieldUpdateOperationsInput | string
    verificationStatus?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    logo?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subscriptionEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    templates?: TripTemplateUncheckedUpdateManyWithoutAgencyNestedInput
    wallet?: WalletUncheckedUpdateOneWithoutAgencyNestedInput
    payoutRequests?: PayoutRequestUncheckedUpdateManyWithoutAgencyNestedInput
  }

  export type AgencyProfileCreateManyInput = {
    id?: string
    userId: string
    companyName: string
    ice: string
    patente: string
    rib: string
    verificationStatus?: $Enums.VerificationStatus
    bio?: string | null
    logo?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    trialEndsAt?: Date | string | null
    subscriptionEndsAt?: Date | string | null
  }

  export type AgencyProfileUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    ice?: StringFieldUpdateOperationsInput | string
    patente?: StringFieldUpdateOperationsInput | string
    rib?: StringFieldUpdateOperationsInput | string
    verificationStatus?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    logo?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subscriptionEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type AgencyProfileUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    ice?: StringFieldUpdateOperationsInput | string
    patente?: StringFieldUpdateOperationsInput | string
    rib?: StringFieldUpdateOperationsInput | string
    verificationStatus?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    logo?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subscriptionEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type TripTemplateCreateInput = {
    id?: string
    title: string
    description: string
    category: $Enums.TripCategory
    startLocation: string
    durationDays: number
    durationNights: number
    inclusions?: TripTemplateCreateinclusionsInput | string[]
    exclusions?: TripTemplateCreateexclusionsInput | string[]
    checklist?: TripTemplateCreatechecklistInput | string[]
    images?: TripTemplateCreateimagesInput | string[]
    status?: $Enums.TripStatus
    featured?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    agency: AgencyProfileCreateNestedOneWithoutTemplatesInput
    sessions?: TripSessionCreateNestedManyWithoutTemplateInput
    itinerary?: ItineraryDayCreateNestedManyWithoutTemplateInput
  }

  export type TripTemplateUncheckedCreateInput = {
    id?: string
    agencyId: string
    title: string
    description: string
    category: $Enums.TripCategory
    startLocation: string
    durationDays: number
    durationNights: number
    inclusions?: TripTemplateCreateinclusionsInput | string[]
    exclusions?: TripTemplateCreateexclusionsInput | string[]
    checklist?: TripTemplateCreatechecklistInput | string[]
    images?: TripTemplateCreateimagesInput | string[]
    status?: $Enums.TripStatus
    featured?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: TripSessionUncheckedCreateNestedManyWithoutTemplateInput
    itinerary?: ItineraryDayUncheckedCreateNestedManyWithoutTemplateInput
  }

  export type TripTemplateUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumTripCategoryFieldUpdateOperationsInput | $Enums.TripCategory
    startLocation?: StringFieldUpdateOperationsInput | string
    durationDays?: IntFieldUpdateOperationsInput | number
    durationNights?: IntFieldUpdateOperationsInput | number
    inclusions?: TripTemplateUpdateinclusionsInput | string[]
    exclusions?: TripTemplateUpdateexclusionsInput | string[]
    checklist?: TripTemplateUpdatechecklistInput | string[]
    images?: TripTemplateUpdateimagesInput | string[]
    status?: EnumTripStatusFieldUpdateOperationsInput | $Enums.TripStatus
    featured?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    agency?: AgencyProfileUpdateOneRequiredWithoutTemplatesNestedInput
    sessions?: TripSessionUpdateManyWithoutTemplateNestedInput
    itinerary?: ItineraryDayUpdateManyWithoutTemplateNestedInput
  }

  export type TripTemplateUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    agencyId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumTripCategoryFieldUpdateOperationsInput | $Enums.TripCategory
    startLocation?: StringFieldUpdateOperationsInput | string
    durationDays?: IntFieldUpdateOperationsInput | number
    durationNights?: IntFieldUpdateOperationsInput | number
    inclusions?: TripTemplateUpdateinclusionsInput | string[]
    exclusions?: TripTemplateUpdateexclusionsInput | string[]
    checklist?: TripTemplateUpdatechecklistInput | string[]
    images?: TripTemplateUpdateimagesInput | string[]
    status?: EnumTripStatusFieldUpdateOperationsInput | $Enums.TripStatus
    featured?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: TripSessionUncheckedUpdateManyWithoutTemplateNestedInput
    itinerary?: ItineraryDayUncheckedUpdateManyWithoutTemplateNestedInput
  }

  export type TripTemplateCreateManyInput = {
    id?: string
    agencyId: string
    title: string
    description: string
    category: $Enums.TripCategory
    startLocation: string
    durationDays: number
    durationNights: number
    inclusions?: TripTemplateCreateinclusionsInput | string[]
    exclusions?: TripTemplateCreateexclusionsInput | string[]
    checklist?: TripTemplateCreatechecklistInput | string[]
    images?: TripTemplateCreateimagesInput | string[]
    status?: $Enums.TripStatus
    featured?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type TripTemplateUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumTripCategoryFieldUpdateOperationsInput | $Enums.TripCategory
    startLocation?: StringFieldUpdateOperationsInput | string
    durationDays?: IntFieldUpdateOperationsInput | number
    durationNights?: IntFieldUpdateOperationsInput | number
    inclusions?: TripTemplateUpdateinclusionsInput | string[]
    exclusions?: TripTemplateUpdateexclusionsInput | string[]
    checklist?: TripTemplateUpdatechecklistInput | string[]
    images?: TripTemplateUpdateimagesInput | string[]
    status?: EnumTripStatusFieldUpdateOperationsInput | $Enums.TripStatus
    featured?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TripTemplateUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    agencyId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumTripCategoryFieldUpdateOperationsInput | $Enums.TripCategory
    startLocation?: StringFieldUpdateOperationsInput | string
    durationDays?: IntFieldUpdateOperationsInput | number
    durationNights?: IntFieldUpdateOperationsInput | number
    inclusions?: TripTemplateUpdateinclusionsInput | string[]
    exclusions?: TripTemplateUpdateexclusionsInput | string[]
    checklist?: TripTemplateUpdatechecklistInput | string[]
    images?: TripTemplateUpdateimagesInput | string[]
    status?: EnumTripStatusFieldUpdateOperationsInput | $Enums.TripStatus
    featured?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ItineraryDayCreateInput = {
    id?: string
    dayNumber: number
    title?: string | null
    description: string
    activities?: ItineraryDayCreateactivitiesInput | string[]
    template: TripTemplateCreateNestedOneWithoutItineraryInput
  }

  export type ItineraryDayUncheckedCreateInput = {
    id?: string
    templateId: string
    dayNumber: number
    title?: string | null
    description: string
    activities?: ItineraryDayCreateactivitiesInput | string[]
  }

  export type ItineraryDayUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    dayNumber?: IntFieldUpdateOperationsInput | number
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: StringFieldUpdateOperationsInput | string
    activities?: ItineraryDayUpdateactivitiesInput | string[]
    template?: TripTemplateUpdateOneRequiredWithoutItineraryNestedInput
  }

  export type ItineraryDayUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    templateId?: StringFieldUpdateOperationsInput | string
    dayNumber?: IntFieldUpdateOperationsInput | number
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: StringFieldUpdateOperationsInput | string
    activities?: ItineraryDayUpdateactivitiesInput | string[]
  }

  export type ItineraryDayCreateManyInput = {
    id?: string
    templateId: string
    dayNumber: number
    title?: string | null
    description: string
    activities?: ItineraryDayCreateactivitiesInput | string[]
  }

  export type ItineraryDayUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    dayNumber?: IntFieldUpdateOperationsInput | number
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: StringFieldUpdateOperationsInput | string
    activities?: ItineraryDayUpdateactivitiesInput | string[]
  }

  export type ItineraryDayUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    templateId?: StringFieldUpdateOperationsInput | string
    dayNumber?: IntFieldUpdateOperationsInput | number
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: StringFieldUpdateOperationsInput | string
    activities?: ItineraryDayUpdateactivitiesInput | string[]
  }

  export type TripSessionCreateInput = {
    id?: string
    startDate: Date | string
    endDate: Date | string
    price: number
    deposit?: number
    totalSeats: number
    availableSeats: number
    status?: string
    template: TripTemplateCreateNestedOneWithoutSessionsInput
    bookings?: BookingCreateNestedManyWithoutSessionInput
  }

  export type TripSessionUncheckedCreateInput = {
    id?: string
    templateId: string
    startDate: Date | string
    endDate: Date | string
    price: number
    deposit?: number
    totalSeats: number
    availableSeats: number
    status?: string
    bookings?: BookingUncheckedCreateNestedManyWithoutSessionInput
  }

  export type TripSessionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    price?: FloatFieldUpdateOperationsInput | number
    deposit?: FloatFieldUpdateOperationsInput | number
    totalSeats?: IntFieldUpdateOperationsInput | number
    availableSeats?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    template?: TripTemplateUpdateOneRequiredWithoutSessionsNestedInput
    bookings?: BookingUpdateManyWithoutSessionNestedInput
  }

  export type TripSessionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    templateId?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    price?: FloatFieldUpdateOperationsInput | number
    deposit?: FloatFieldUpdateOperationsInput | number
    totalSeats?: IntFieldUpdateOperationsInput | number
    availableSeats?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    bookings?: BookingUncheckedUpdateManyWithoutSessionNestedInput
  }

  export type TripSessionCreateManyInput = {
    id?: string
    templateId: string
    startDate: Date | string
    endDate: Date | string
    price: number
    deposit?: number
    totalSeats: number
    availableSeats: number
    status?: string
  }

  export type TripSessionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    price?: FloatFieldUpdateOperationsInput | number
    deposit?: FloatFieldUpdateOperationsInput | number
    totalSeats?: IntFieldUpdateOperationsInput | number
    availableSeats?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
  }

  export type TripSessionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    templateId?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    price?: FloatFieldUpdateOperationsInput | number
    deposit?: FloatFieldUpdateOperationsInput | number
    totalSeats?: IntFieldUpdateOperationsInput | number
    availableSeats?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
  }

  export type BookingCreateInput = {
    id?: string
    bookingDate?: Date | string
    status?: $Enums.BookingStatus
    totalAmount: number
    guestsCount: number
    paymentProofId?: string | null
    session: TripSessionCreateNestedOneWithoutBookingsInput
    traveler: UserCreateNestedOneWithoutBookingsInput
    paymentProof?: PaymentProofCreateNestedOneWithoutBookingInput
  }

  export type BookingUncheckedCreateInput = {
    id?: string
    sessionId: string
    travelerId: string
    bookingDate?: Date | string
    status?: $Enums.BookingStatus
    totalAmount: number
    guestsCount: number
    paymentProofId?: string | null
    paymentProof?: PaymentProofUncheckedCreateNestedOneWithoutBookingInput
  }

  export type BookingUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    bookingDate?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumBookingStatusFieldUpdateOperationsInput | $Enums.BookingStatus
    totalAmount?: FloatFieldUpdateOperationsInput | number
    guestsCount?: IntFieldUpdateOperationsInput | number
    paymentProofId?: NullableStringFieldUpdateOperationsInput | string | null
    session?: TripSessionUpdateOneRequiredWithoutBookingsNestedInput
    traveler?: UserUpdateOneRequiredWithoutBookingsNestedInput
    paymentProof?: PaymentProofUpdateOneWithoutBookingNestedInput
  }

  export type BookingUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionId?: StringFieldUpdateOperationsInput | string
    travelerId?: StringFieldUpdateOperationsInput | string
    bookingDate?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumBookingStatusFieldUpdateOperationsInput | $Enums.BookingStatus
    totalAmount?: FloatFieldUpdateOperationsInput | number
    guestsCount?: IntFieldUpdateOperationsInput | number
    paymentProofId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentProof?: PaymentProofUncheckedUpdateOneWithoutBookingNestedInput
  }

  export type BookingCreateManyInput = {
    id?: string
    sessionId: string
    travelerId: string
    bookingDate?: Date | string
    status?: $Enums.BookingStatus
    totalAmount: number
    guestsCount: number
    paymentProofId?: string | null
  }

  export type BookingUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    bookingDate?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumBookingStatusFieldUpdateOperationsInput | $Enums.BookingStatus
    totalAmount?: FloatFieldUpdateOperationsInput | number
    guestsCount?: IntFieldUpdateOperationsInput | number
    paymentProofId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type BookingUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionId?: StringFieldUpdateOperationsInput | string
    travelerId?: StringFieldUpdateOperationsInput | string
    bookingDate?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumBookingStatusFieldUpdateOperationsInput | $Enums.BookingStatus
    totalAmount?: FloatFieldUpdateOperationsInput | number
    guestsCount?: IntFieldUpdateOperationsInput | number
    paymentProofId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type PaymentProofCreateInput = {
    id?: string
    imageUrl: string
    uploadedAt?: Date | string
    status?: $Enums.VerificationStatus
    booking: BookingCreateNestedOneWithoutPaymentProofInput
  }

  export type PaymentProofUncheckedCreateInput = {
    id?: string
    bookingId: string
    imageUrl: string
    uploadedAt?: Date | string
    status?: $Enums.VerificationStatus
  }

  export type PaymentProofUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageUrl?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
    booking?: BookingUpdateOneRequiredWithoutPaymentProofNestedInput
  }

  export type PaymentProofUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    bookingId?: StringFieldUpdateOperationsInput | string
    imageUrl?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
  }

  export type PaymentProofCreateManyInput = {
    id?: string
    bookingId: string
    imageUrl: string
    uploadedAt?: Date | string
    status?: $Enums.VerificationStatus
  }

  export type PaymentProofUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageUrl?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
  }

  export type PaymentProofUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    bookingId?: StringFieldUpdateOperationsInput | string
    imageUrl?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
  }

  export type WalletCreateInput = {
    id?: string
    availableBalance?: number
    pendingBalance?: number
    agency: AgencyProfileCreateNestedOneWithoutWalletInput
    transactions?: WalletTransactionCreateNestedManyWithoutWalletInput
  }

  export type WalletUncheckedCreateInput = {
    id?: string
    agencyId: string
    availableBalance?: number
    pendingBalance?: number
    transactions?: WalletTransactionUncheckedCreateNestedManyWithoutWalletInput
  }

  export type WalletUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    availableBalance?: FloatFieldUpdateOperationsInput | number
    pendingBalance?: FloatFieldUpdateOperationsInput | number
    agency?: AgencyProfileUpdateOneRequiredWithoutWalletNestedInput
    transactions?: WalletTransactionUpdateManyWithoutWalletNestedInput
  }

  export type WalletUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    agencyId?: StringFieldUpdateOperationsInput | string
    availableBalance?: FloatFieldUpdateOperationsInput | number
    pendingBalance?: FloatFieldUpdateOperationsInput | number
    transactions?: WalletTransactionUncheckedUpdateManyWithoutWalletNestedInput
  }

  export type WalletCreateManyInput = {
    id?: string
    agencyId: string
    availableBalance?: number
    pendingBalance?: number
  }

  export type WalletUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    availableBalance?: FloatFieldUpdateOperationsInput | number
    pendingBalance?: FloatFieldUpdateOperationsInput | number
  }

  export type WalletUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    agencyId?: StringFieldUpdateOperationsInput | string
    availableBalance?: FloatFieldUpdateOperationsInput | number
    pendingBalance?: FloatFieldUpdateOperationsInput | number
  }

  export type WalletTransactionCreateInput = {
    id?: string
    amount: number
    type: $Enums.TransactionType
    reason: string
    createdAt?: Date | string
    wallet: WalletCreateNestedOneWithoutTransactionsInput
  }

  export type WalletTransactionUncheckedCreateInput = {
    id?: string
    walletId: string
    amount: number
    type: $Enums.TransactionType
    reason: string
    createdAt?: Date | string
  }

  export type WalletTransactionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    wallet?: WalletUpdateOneRequiredWithoutTransactionsNestedInput
  }

  export type WalletTransactionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WalletTransactionCreateManyInput = {
    id?: string
    walletId: string
    amount: number
    type: $Enums.TransactionType
    reason: string
    createdAt?: Date | string
  }

  export type WalletTransactionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WalletTransactionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    walletId?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PayoutRequestCreateInput = {
    id?: string
    amount: number
    status?: $Enums.PayoutStatus
    requestedAt?: Date | string
    processedAt?: Date | string | null
    bankDetails: string
    agency: AgencyProfileCreateNestedOneWithoutPayoutRequestsInput
  }

  export type PayoutRequestUncheckedCreateInput = {
    id?: string
    agencyId: string
    amount: number
    status?: $Enums.PayoutStatus
    requestedAt?: Date | string
    processedAt?: Date | string | null
    bankDetails: string
  }

  export type PayoutRequestUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    status?: EnumPayoutStatusFieldUpdateOperationsInput | $Enums.PayoutStatus
    requestedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bankDetails?: StringFieldUpdateOperationsInput | string
    agency?: AgencyProfileUpdateOneRequiredWithoutPayoutRequestsNestedInput
  }

  export type PayoutRequestUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    agencyId?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    status?: EnumPayoutStatusFieldUpdateOperationsInput | $Enums.PayoutStatus
    requestedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bankDetails?: StringFieldUpdateOperationsInput | string
  }

  export type PayoutRequestCreateManyInput = {
    id?: string
    agencyId: string
    amount: number
    status?: $Enums.PayoutStatus
    requestedAt?: Date | string
    processedAt?: Date | string | null
    bankDetails: string
  }

  export type PayoutRequestUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    status?: EnumPayoutStatusFieldUpdateOperationsInput | $Enums.PayoutStatus
    requestedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bankDetails?: StringFieldUpdateOperationsInput | string
  }

  export type PayoutRequestUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    agencyId?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    status?: EnumPayoutStatusFieldUpdateOperationsInput | $Enums.PayoutStatus
    requestedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bankDetails?: StringFieldUpdateOperationsInput | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type AgencyProfileNullableRelationFilter = {
    is?: AgencyProfileWhereInput | null
    isNot?: AgencyProfileWhereInput | null
  }

  export type BookingListRelationFilter = {
    every?: BookingWhereInput
    some?: BookingWhereInput
    none?: BookingWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type BookingOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    avatar?: SortOrder
    isEmailVerified?: SortOrder
    otp?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    avatar?: SortOrder
    isEmailVerified?: SortOrder
    otp?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    avatar?: SortOrder
    isEmailVerified?: SortOrder
    otp?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type EnumVerificationStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.VerificationStatus | EnumVerificationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.VerificationStatus[] | ListEnumVerificationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.VerificationStatus[] | ListEnumVerificationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumVerificationStatusFilter<$PrismaModel> | $Enums.VerificationStatus
  }

  export type EnumSubscriptionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusFilter<$PrismaModel> | $Enums.SubscriptionStatus
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type UserRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type TripTemplateListRelationFilter = {
    every?: TripTemplateWhereInput
    some?: TripTemplateWhereInput
    none?: TripTemplateWhereInput
  }

  export type WalletNullableRelationFilter = {
    is?: WalletWhereInput | null
    isNot?: WalletWhereInput | null
  }

  export type PayoutRequestListRelationFilter = {
    every?: PayoutRequestWhereInput
    some?: PayoutRequestWhereInput
    none?: PayoutRequestWhereInput
  }

  export type TripTemplateOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type PayoutRequestOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AgencyProfileCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    companyName?: SortOrder
    ice?: SortOrder
    patente?: SortOrder
    rib?: SortOrder
    verificationStatus?: SortOrder
    bio?: SortOrder
    logo?: SortOrder
    subscriptionStatus?: SortOrder
    trialEndsAt?: SortOrder
    subscriptionEndsAt?: SortOrder
  }

  export type AgencyProfileMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    companyName?: SortOrder
    ice?: SortOrder
    patente?: SortOrder
    rib?: SortOrder
    verificationStatus?: SortOrder
    bio?: SortOrder
    logo?: SortOrder
    subscriptionStatus?: SortOrder
    trialEndsAt?: SortOrder
    subscriptionEndsAt?: SortOrder
  }

  export type AgencyProfileMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    companyName?: SortOrder
    ice?: SortOrder
    patente?: SortOrder
    rib?: SortOrder
    verificationStatus?: SortOrder
    bio?: SortOrder
    logo?: SortOrder
    subscriptionStatus?: SortOrder
    trialEndsAt?: SortOrder
    subscriptionEndsAt?: SortOrder
  }

  export type EnumVerificationStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.VerificationStatus | EnumVerificationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.VerificationStatus[] | ListEnumVerificationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.VerificationStatus[] | ListEnumVerificationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumVerificationStatusWithAggregatesFilter<$PrismaModel> | $Enums.VerificationStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumVerificationStatusFilter<$PrismaModel>
    _max?: NestedEnumVerificationStatusFilter<$PrismaModel>
  }

  export type EnumSubscriptionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SubscriptionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
    _max?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type EnumTripCategoryFilter<$PrismaModel = never> = {
    equals?: $Enums.TripCategory | EnumTripCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.TripCategory[] | ListEnumTripCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.TripCategory[] | ListEnumTripCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumTripCategoryFilter<$PrismaModel> | $Enums.TripCategory
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringNullableListFilter<$PrismaModel = never> = {
    equals?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    has?: string | StringFieldRefInput<$PrismaModel> | null
    hasEvery?: string[] | ListStringFieldRefInput<$PrismaModel>
    hasSome?: string[] | ListStringFieldRefInput<$PrismaModel>
    isEmpty?: boolean
  }

  export type EnumTripStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TripStatus | EnumTripStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TripStatus[] | ListEnumTripStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TripStatus[] | ListEnumTripStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTripStatusFilter<$PrismaModel> | $Enums.TripStatus
  }

  export type AgencyProfileRelationFilter = {
    is?: AgencyProfileWhereInput
    isNot?: AgencyProfileWhereInput
  }

  export type TripSessionListRelationFilter = {
    every?: TripSessionWhereInput
    some?: TripSessionWhereInput
    none?: TripSessionWhereInput
  }

  export type ItineraryDayListRelationFilter = {
    every?: ItineraryDayWhereInput
    some?: ItineraryDayWhereInput
    none?: ItineraryDayWhereInput
  }

  export type TripSessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ItineraryDayOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type TripTemplateCountOrderByAggregateInput = {
    id?: SortOrder
    agencyId?: SortOrder
    title?: SortOrder
    description?: SortOrder
    category?: SortOrder
    startLocation?: SortOrder
    durationDays?: SortOrder
    durationNights?: SortOrder
    inclusions?: SortOrder
    exclusions?: SortOrder
    checklist?: SortOrder
    images?: SortOrder
    status?: SortOrder
    featured?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TripTemplateAvgOrderByAggregateInput = {
    durationDays?: SortOrder
    durationNights?: SortOrder
  }

  export type TripTemplateMaxOrderByAggregateInput = {
    id?: SortOrder
    agencyId?: SortOrder
    title?: SortOrder
    description?: SortOrder
    category?: SortOrder
    startLocation?: SortOrder
    durationDays?: SortOrder
    durationNights?: SortOrder
    status?: SortOrder
    featured?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TripTemplateMinOrderByAggregateInput = {
    id?: SortOrder
    agencyId?: SortOrder
    title?: SortOrder
    description?: SortOrder
    category?: SortOrder
    startLocation?: SortOrder
    durationDays?: SortOrder
    durationNights?: SortOrder
    status?: SortOrder
    featured?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type TripTemplateSumOrderByAggregateInput = {
    durationDays?: SortOrder
    durationNights?: SortOrder
  }

  export type EnumTripCategoryWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TripCategory | EnumTripCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.TripCategory[] | ListEnumTripCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.TripCategory[] | ListEnumTripCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumTripCategoryWithAggregatesFilter<$PrismaModel> | $Enums.TripCategory
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTripCategoryFilter<$PrismaModel>
    _max?: NestedEnumTripCategoryFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type EnumTripStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TripStatus | EnumTripStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TripStatus[] | ListEnumTripStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TripStatus[] | ListEnumTripStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTripStatusWithAggregatesFilter<$PrismaModel> | $Enums.TripStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTripStatusFilter<$PrismaModel>
    _max?: NestedEnumTripStatusFilter<$PrismaModel>
  }

  export type TripTemplateRelationFilter = {
    is?: TripTemplateWhereInput
    isNot?: TripTemplateWhereInput
  }

  export type ItineraryDayCountOrderByAggregateInput = {
    id?: SortOrder
    templateId?: SortOrder
    dayNumber?: SortOrder
    title?: SortOrder
    description?: SortOrder
    activities?: SortOrder
  }

  export type ItineraryDayAvgOrderByAggregateInput = {
    dayNumber?: SortOrder
  }

  export type ItineraryDayMaxOrderByAggregateInput = {
    id?: SortOrder
    templateId?: SortOrder
    dayNumber?: SortOrder
    title?: SortOrder
    description?: SortOrder
  }

  export type ItineraryDayMinOrderByAggregateInput = {
    id?: SortOrder
    templateId?: SortOrder
    dayNumber?: SortOrder
    title?: SortOrder
    description?: SortOrder
  }

  export type ItineraryDaySumOrderByAggregateInput = {
    dayNumber?: SortOrder
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type TripSessionCountOrderByAggregateInput = {
    id?: SortOrder
    templateId?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    price?: SortOrder
    deposit?: SortOrder
    totalSeats?: SortOrder
    availableSeats?: SortOrder
    status?: SortOrder
  }

  export type TripSessionAvgOrderByAggregateInput = {
    price?: SortOrder
    deposit?: SortOrder
    totalSeats?: SortOrder
    availableSeats?: SortOrder
  }

  export type TripSessionMaxOrderByAggregateInput = {
    id?: SortOrder
    templateId?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    price?: SortOrder
    deposit?: SortOrder
    totalSeats?: SortOrder
    availableSeats?: SortOrder
    status?: SortOrder
  }

  export type TripSessionMinOrderByAggregateInput = {
    id?: SortOrder
    templateId?: SortOrder
    startDate?: SortOrder
    endDate?: SortOrder
    price?: SortOrder
    deposit?: SortOrder
    totalSeats?: SortOrder
    availableSeats?: SortOrder
    status?: SortOrder
  }

  export type TripSessionSumOrderByAggregateInput = {
    price?: SortOrder
    deposit?: SortOrder
    totalSeats?: SortOrder
    availableSeats?: SortOrder
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type EnumBookingStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.BookingStatus | EnumBookingStatusFieldRefInput<$PrismaModel>
    in?: $Enums.BookingStatus[] | ListEnumBookingStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.BookingStatus[] | ListEnumBookingStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumBookingStatusFilter<$PrismaModel> | $Enums.BookingStatus
  }

  export type TripSessionRelationFilter = {
    is?: TripSessionWhereInput
    isNot?: TripSessionWhereInput
  }

  export type PaymentProofNullableRelationFilter = {
    is?: PaymentProofWhereInput | null
    isNot?: PaymentProofWhereInput | null
  }

  export type BookingCountOrderByAggregateInput = {
    id?: SortOrder
    sessionId?: SortOrder
    travelerId?: SortOrder
    bookingDate?: SortOrder
    status?: SortOrder
    totalAmount?: SortOrder
    guestsCount?: SortOrder
    paymentProofId?: SortOrder
  }

  export type BookingAvgOrderByAggregateInput = {
    totalAmount?: SortOrder
    guestsCount?: SortOrder
  }

  export type BookingMaxOrderByAggregateInput = {
    id?: SortOrder
    sessionId?: SortOrder
    travelerId?: SortOrder
    bookingDate?: SortOrder
    status?: SortOrder
    totalAmount?: SortOrder
    guestsCount?: SortOrder
    paymentProofId?: SortOrder
  }

  export type BookingMinOrderByAggregateInput = {
    id?: SortOrder
    sessionId?: SortOrder
    travelerId?: SortOrder
    bookingDate?: SortOrder
    status?: SortOrder
    totalAmount?: SortOrder
    guestsCount?: SortOrder
    paymentProofId?: SortOrder
  }

  export type BookingSumOrderByAggregateInput = {
    totalAmount?: SortOrder
    guestsCount?: SortOrder
  }

  export type EnumBookingStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.BookingStatus | EnumBookingStatusFieldRefInput<$PrismaModel>
    in?: $Enums.BookingStatus[] | ListEnumBookingStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.BookingStatus[] | ListEnumBookingStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumBookingStatusWithAggregatesFilter<$PrismaModel> | $Enums.BookingStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumBookingStatusFilter<$PrismaModel>
    _max?: NestedEnumBookingStatusFilter<$PrismaModel>
  }

  export type BookingRelationFilter = {
    is?: BookingWhereInput
    isNot?: BookingWhereInput
  }

  export type PaymentProofCountOrderByAggregateInput = {
    id?: SortOrder
    bookingId?: SortOrder
    imageUrl?: SortOrder
    uploadedAt?: SortOrder
    status?: SortOrder
  }

  export type PaymentProofMaxOrderByAggregateInput = {
    id?: SortOrder
    bookingId?: SortOrder
    imageUrl?: SortOrder
    uploadedAt?: SortOrder
    status?: SortOrder
  }

  export type PaymentProofMinOrderByAggregateInput = {
    id?: SortOrder
    bookingId?: SortOrder
    imageUrl?: SortOrder
    uploadedAt?: SortOrder
    status?: SortOrder
  }

  export type WalletTransactionListRelationFilter = {
    every?: WalletTransactionWhereInput
    some?: WalletTransactionWhereInput
    none?: WalletTransactionWhereInput
  }

  export type WalletTransactionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type WalletCountOrderByAggregateInput = {
    id?: SortOrder
    agencyId?: SortOrder
    availableBalance?: SortOrder
    pendingBalance?: SortOrder
  }

  export type WalletAvgOrderByAggregateInput = {
    availableBalance?: SortOrder
    pendingBalance?: SortOrder
  }

  export type WalletMaxOrderByAggregateInput = {
    id?: SortOrder
    agencyId?: SortOrder
    availableBalance?: SortOrder
    pendingBalance?: SortOrder
  }

  export type WalletMinOrderByAggregateInput = {
    id?: SortOrder
    agencyId?: SortOrder
    availableBalance?: SortOrder
    pendingBalance?: SortOrder
  }

  export type WalletSumOrderByAggregateInput = {
    availableBalance?: SortOrder
    pendingBalance?: SortOrder
  }

  export type EnumTransactionTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeFilter<$PrismaModel> | $Enums.TransactionType
  }

  export type WalletRelationFilter = {
    is?: WalletWhereInput
    isNot?: WalletWhereInput
  }

  export type WalletTransactionCountOrderByAggregateInput = {
    id?: SortOrder
    walletId?: SortOrder
    amount?: SortOrder
    type?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
  }

  export type WalletTransactionAvgOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type WalletTransactionMaxOrderByAggregateInput = {
    id?: SortOrder
    walletId?: SortOrder
    amount?: SortOrder
    type?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
  }

  export type WalletTransactionMinOrderByAggregateInput = {
    id?: SortOrder
    walletId?: SortOrder
    amount?: SortOrder
    type?: SortOrder
    reason?: SortOrder
    createdAt?: SortOrder
  }

  export type WalletTransactionSumOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type EnumTransactionTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeWithAggregatesFilter<$PrismaModel> | $Enums.TransactionType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTransactionTypeFilter<$PrismaModel>
    _max?: NestedEnumTransactionTypeFilter<$PrismaModel>
  }

  export type EnumPayoutStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.PayoutStatus | EnumPayoutStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PayoutStatus[] | ListEnumPayoutStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PayoutStatus[] | ListEnumPayoutStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPayoutStatusFilter<$PrismaModel> | $Enums.PayoutStatus
  }

  export type PayoutRequestCountOrderByAggregateInput = {
    id?: SortOrder
    agencyId?: SortOrder
    amount?: SortOrder
    status?: SortOrder
    requestedAt?: SortOrder
    processedAt?: SortOrder
    bankDetails?: SortOrder
  }

  export type PayoutRequestAvgOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type PayoutRequestMaxOrderByAggregateInput = {
    id?: SortOrder
    agencyId?: SortOrder
    amount?: SortOrder
    status?: SortOrder
    requestedAt?: SortOrder
    processedAt?: SortOrder
    bankDetails?: SortOrder
  }

  export type PayoutRequestMinOrderByAggregateInput = {
    id?: SortOrder
    agencyId?: SortOrder
    amount?: SortOrder
    status?: SortOrder
    requestedAt?: SortOrder
    processedAt?: SortOrder
    bankDetails?: SortOrder
  }

  export type PayoutRequestSumOrderByAggregateInput = {
    amount?: SortOrder
  }

  export type EnumPayoutStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PayoutStatus | EnumPayoutStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PayoutStatus[] | ListEnumPayoutStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PayoutStatus[] | ListEnumPayoutStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPayoutStatusWithAggregatesFilter<$PrismaModel> | $Enums.PayoutStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPayoutStatusFilter<$PrismaModel>
    _max?: NestedEnumPayoutStatusFilter<$PrismaModel>
  }

  export type AgencyProfileCreateNestedOneWithoutUserInput = {
    create?: XOR<AgencyProfileCreateWithoutUserInput, AgencyProfileUncheckedCreateWithoutUserInput>
    connectOrCreate?: AgencyProfileCreateOrConnectWithoutUserInput
    connect?: AgencyProfileWhereUniqueInput
  }

  export type BookingCreateNestedManyWithoutTravelerInput = {
    create?: XOR<BookingCreateWithoutTravelerInput, BookingUncheckedCreateWithoutTravelerInput> | BookingCreateWithoutTravelerInput[] | BookingUncheckedCreateWithoutTravelerInput[]
    connectOrCreate?: BookingCreateOrConnectWithoutTravelerInput | BookingCreateOrConnectWithoutTravelerInput[]
    createMany?: BookingCreateManyTravelerInputEnvelope
    connect?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
  }

  export type AgencyProfileUncheckedCreateNestedOneWithoutUserInput = {
    create?: XOR<AgencyProfileCreateWithoutUserInput, AgencyProfileUncheckedCreateWithoutUserInput>
    connectOrCreate?: AgencyProfileCreateOrConnectWithoutUserInput
    connect?: AgencyProfileWhereUniqueInput
  }

  export type BookingUncheckedCreateNestedManyWithoutTravelerInput = {
    create?: XOR<BookingCreateWithoutTravelerInput, BookingUncheckedCreateWithoutTravelerInput> | BookingCreateWithoutTravelerInput[] | BookingUncheckedCreateWithoutTravelerInput[]
    connectOrCreate?: BookingCreateOrConnectWithoutTravelerInput | BookingCreateOrConnectWithoutTravelerInput[]
    createMany?: BookingCreateManyTravelerInputEnvelope
    connect?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumUserRoleFieldUpdateOperationsInput = {
    set?: $Enums.UserRole
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type AgencyProfileUpdateOneWithoutUserNestedInput = {
    create?: XOR<AgencyProfileCreateWithoutUserInput, AgencyProfileUncheckedCreateWithoutUserInput>
    connectOrCreate?: AgencyProfileCreateOrConnectWithoutUserInput
    upsert?: AgencyProfileUpsertWithoutUserInput
    disconnect?: AgencyProfileWhereInput | boolean
    delete?: AgencyProfileWhereInput | boolean
    connect?: AgencyProfileWhereUniqueInput
    update?: XOR<XOR<AgencyProfileUpdateToOneWithWhereWithoutUserInput, AgencyProfileUpdateWithoutUserInput>, AgencyProfileUncheckedUpdateWithoutUserInput>
  }

  export type BookingUpdateManyWithoutTravelerNestedInput = {
    create?: XOR<BookingCreateWithoutTravelerInput, BookingUncheckedCreateWithoutTravelerInput> | BookingCreateWithoutTravelerInput[] | BookingUncheckedCreateWithoutTravelerInput[]
    connectOrCreate?: BookingCreateOrConnectWithoutTravelerInput | BookingCreateOrConnectWithoutTravelerInput[]
    upsert?: BookingUpsertWithWhereUniqueWithoutTravelerInput | BookingUpsertWithWhereUniqueWithoutTravelerInput[]
    createMany?: BookingCreateManyTravelerInputEnvelope
    set?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    disconnect?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    delete?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    connect?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    update?: BookingUpdateWithWhereUniqueWithoutTravelerInput | BookingUpdateWithWhereUniqueWithoutTravelerInput[]
    updateMany?: BookingUpdateManyWithWhereWithoutTravelerInput | BookingUpdateManyWithWhereWithoutTravelerInput[]
    deleteMany?: BookingScalarWhereInput | BookingScalarWhereInput[]
  }

  export type AgencyProfileUncheckedUpdateOneWithoutUserNestedInput = {
    create?: XOR<AgencyProfileCreateWithoutUserInput, AgencyProfileUncheckedCreateWithoutUserInput>
    connectOrCreate?: AgencyProfileCreateOrConnectWithoutUserInput
    upsert?: AgencyProfileUpsertWithoutUserInput
    disconnect?: AgencyProfileWhereInput | boolean
    delete?: AgencyProfileWhereInput | boolean
    connect?: AgencyProfileWhereUniqueInput
    update?: XOR<XOR<AgencyProfileUpdateToOneWithWhereWithoutUserInput, AgencyProfileUpdateWithoutUserInput>, AgencyProfileUncheckedUpdateWithoutUserInput>
  }

  export type BookingUncheckedUpdateManyWithoutTravelerNestedInput = {
    create?: XOR<BookingCreateWithoutTravelerInput, BookingUncheckedCreateWithoutTravelerInput> | BookingCreateWithoutTravelerInput[] | BookingUncheckedCreateWithoutTravelerInput[]
    connectOrCreate?: BookingCreateOrConnectWithoutTravelerInput | BookingCreateOrConnectWithoutTravelerInput[]
    upsert?: BookingUpsertWithWhereUniqueWithoutTravelerInput | BookingUpsertWithWhereUniqueWithoutTravelerInput[]
    createMany?: BookingCreateManyTravelerInputEnvelope
    set?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    disconnect?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    delete?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    connect?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    update?: BookingUpdateWithWhereUniqueWithoutTravelerInput | BookingUpdateWithWhereUniqueWithoutTravelerInput[]
    updateMany?: BookingUpdateManyWithWhereWithoutTravelerInput | BookingUpdateManyWithWhereWithoutTravelerInput[]
    deleteMany?: BookingScalarWhereInput | BookingScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutAgencyProfileInput = {
    create?: XOR<UserCreateWithoutAgencyProfileInput, UserUncheckedCreateWithoutAgencyProfileInput>
    connectOrCreate?: UserCreateOrConnectWithoutAgencyProfileInput
    connect?: UserWhereUniqueInput
  }

  export type TripTemplateCreateNestedManyWithoutAgencyInput = {
    create?: XOR<TripTemplateCreateWithoutAgencyInput, TripTemplateUncheckedCreateWithoutAgencyInput> | TripTemplateCreateWithoutAgencyInput[] | TripTemplateUncheckedCreateWithoutAgencyInput[]
    connectOrCreate?: TripTemplateCreateOrConnectWithoutAgencyInput | TripTemplateCreateOrConnectWithoutAgencyInput[]
    createMany?: TripTemplateCreateManyAgencyInputEnvelope
    connect?: TripTemplateWhereUniqueInput | TripTemplateWhereUniqueInput[]
  }

  export type WalletCreateNestedOneWithoutAgencyInput = {
    create?: XOR<WalletCreateWithoutAgencyInput, WalletUncheckedCreateWithoutAgencyInput>
    connectOrCreate?: WalletCreateOrConnectWithoutAgencyInput
    connect?: WalletWhereUniqueInput
  }

  export type PayoutRequestCreateNestedManyWithoutAgencyInput = {
    create?: XOR<PayoutRequestCreateWithoutAgencyInput, PayoutRequestUncheckedCreateWithoutAgencyInput> | PayoutRequestCreateWithoutAgencyInput[] | PayoutRequestUncheckedCreateWithoutAgencyInput[]
    connectOrCreate?: PayoutRequestCreateOrConnectWithoutAgencyInput | PayoutRequestCreateOrConnectWithoutAgencyInput[]
    createMany?: PayoutRequestCreateManyAgencyInputEnvelope
    connect?: PayoutRequestWhereUniqueInput | PayoutRequestWhereUniqueInput[]
  }

  export type TripTemplateUncheckedCreateNestedManyWithoutAgencyInput = {
    create?: XOR<TripTemplateCreateWithoutAgencyInput, TripTemplateUncheckedCreateWithoutAgencyInput> | TripTemplateCreateWithoutAgencyInput[] | TripTemplateUncheckedCreateWithoutAgencyInput[]
    connectOrCreate?: TripTemplateCreateOrConnectWithoutAgencyInput | TripTemplateCreateOrConnectWithoutAgencyInput[]
    createMany?: TripTemplateCreateManyAgencyInputEnvelope
    connect?: TripTemplateWhereUniqueInput | TripTemplateWhereUniqueInput[]
  }

  export type WalletUncheckedCreateNestedOneWithoutAgencyInput = {
    create?: XOR<WalletCreateWithoutAgencyInput, WalletUncheckedCreateWithoutAgencyInput>
    connectOrCreate?: WalletCreateOrConnectWithoutAgencyInput
    connect?: WalletWhereUniqueInput
  }

  export type PayoutRequestUncheckedCreateNestedManyWithoutAgencyInput = {
    create?: XOR<PayoutRequestCreateWithoutAgencyInput, PayoutRequestUncheckedCreateWithoutAgencyInput> | PayoutRequestCreateWithoutAgencyInput[] | PayoutRequestUncheckedCreateWithoutAgencyInput[]
    connectOrCreate?: PayoutRequestCreateOrConnectWithoutAgencyInput | PayoutRequestCreateOrConnectWithoutAgencyInput[]
    createMany?: PayoutRequestCreateManyAgencyInputEnvelope
    connect?: PayoutRequestWhereUniqueInput | PayoutRequestWhereUniqueInput[]
  }

  export type EnumVerificationStatusFieldUpdateOperationsInput = {
    set?: $Enums.VerificationStatus
  }

  export type EnumSubscriptionStatusFieldUpdateOperationsInput = {
    set?: $Enums.SubscriptionStatus
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type UserUpdateOneRequiredWithoutAgencyProfileNestedInput = {
    create?: XOR<UserCreateWithoutAgencyProfileInput, UserUncheckedCreateWithoutAgencyProfileInput>
    connectOrCreate?: UserCreateOrConnectWithoutAgencyProfileInput
    upsert?: UserUpsertWithoutAgencyProfileInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAgencyProfileInput, UserUpdateWithoutAgencyProfileInput>, UserUncheckedUpdateWithoutAgencyProfileInput>
  }

  export type TripTemplateUpdateManyWithoutAgencyNestedInput = {
    create?: XOR<TripTemplateCreateWithoutAgencyInput, TripTemplateUncheckedCreateWithoutAgencyInput> | TripTemplateCreateWithoutAgencyInput[] | TripTemplateUncheckedCreateWithoutAgencyInput[]
    connectOrCreate?: TripTemplateCreateOrConnectWithoutAgencyInput | TripTemplateCreateOrConnectWithoutAgencyInput[]
    upsert?: TripTemplateUpsertWithWhereUniqueWithoutAgencyInput | TripTemplateUpsertWithWhereUniqueWithoutAgencyInput[]
    createMany?: TripTemplateCreateManyAgencyInputEnvelope
    set?: TripTemplateWhereUniqueInput | TripTemplateWhereUniqueInput[]
    disconnect?: TripTemplateWhereUniqueInput | TripTemplateWhereUniqueInput[]
    delete?: TripTemplateWhereUniqueInput | TripTemplateWhereUniqueInput[]
    connect?: TripTemplateWhereUniqueInput | TripTemplateWhereUniqueInput[]
    update?: TripTemplateUpdateWithWhereUniqueWithoutAgencyInput | TripTemplateUpdateWithWhereUniqueWithoutAgencyInput[]
    updateMany?: TripTemplateUpdateManyWithWhereWithoutAgencyInput | TripTemplateUpdateManyWithWhereWithoutAgencyInput[]
    deleteMany?: TripTemplateScalarWhereInput | TripTemplateScalarWhereInput[]
  }

  export type WalletUpdateOneWithoutAgencyNestedInput = {
    create?: XOR<WalletCreateWithoutAgencyInput, WalletUncheckedCreateWithoutAgencyInput>
    connectOrCreate?: WalletCreateOrConnectWithoutAgencyInput
    upsert?: WalletUpsertWithoutAgencyInput
    disconnect?: WalletWhereInput | boolean
    delete?: WalletWhereInput | boolean
    connect?: WalletWhereUniqueInput
    update?: XOR<XOR<WalletUpdateToOneWithWhereWithoutAgencyInput, WalletUpdateWithoutAgencyInput>, WalletUncheckedUpdateWithoutAgencyInput>
  }

  export type PayoutRequestUpdateManyWithoutAgencyNestedInput = {
    create?: XOR<PayoutRequestCreateWithoutAgencyInput, PayoutRequestUncheckedCreateWithoutAgencyInput> | PayoutRequestCreateWithoutAgencyInput[] | PayoutRequestUncheckedCreateWithoutAgencyInput[]
    connectOrCreate?: PayoutRequestCreateOrConnectWithoutAgencyInput | PayoutRequestCreateOrConnectWithoutAgencyInput[]
    upsert?: PayoutRequestUpsertWithWhereUniqueWithoutAgencyInput | PayoutRequestUpsertWithWhereUniqueWithoutAgencyInput[]
    createMany?: PayoutRequestCreateManyAgencyInputEnvelope
    set?: PayoutRequestWhereUniqueInput | PayoutRequestWhereUniqueInput[]
    disconnect?: PayoutRequestWhereUniqueInput | PayoutRequestWhereUniqueInput[]
    delete?: PayoutRequestWhereUniqueInput | PayoutRequestWhereUniqueInput[]
    connect?: PayoutRequestWhereUniqueInput | PayoutRequestWhereUniqueInput[]
    update?: PayoutRequestUpdateWithWhereUniqueWithoutAgencyInput | PayoutRequestUpdateWithWhereUniqueWithoutAgencyInput[]
    updateMany?: PayoutRequestUpdateManyWithWhereWithoutAgencyInput | PayoutRequestUpdateManyWithWhereWithoutAgencyInput[]
    deleteMany?: PayoutRequestScalarWhereInput | PayoutRequestScalarWhereInput[]
  }

  export type TripTemplateUncheckedUpdateManyWithoutAgencyNestedInput = {
    create?: XOR<TripTemplateCreateWithoutAgencyInput, TripTemplateUncheckedCreateWithoutAgencyInput> | TripTemplateCreateWithoutAgencyInput[] | TripTemplateUncheckedCreateWithoutAgencyInput[]
    connectOrCreate?: TripTemplateCreateOrConnectWithoutAgencyInput | TripTemplateCreateOrConnectWithoutAgencyInput[]
    upsert?: TripTemplateUpsertWithWhereUniqueWithoutAgencyInput | TripTemplateUpsertWithWhereUniqueWithoutAgencyInput[]
    createMany?: TripTemplateCreateManyAgencyInputEnvelope
    set?: TripTemplateWhereUniqueInput | TripTemplateWhereUniqueInput[]
    disconnect?: TripTemplateWhereUniqueInput | TripTemplateWhereUniqueInput[]
    delete?: TripTemplateWhereUniqueInput | TripTemplateWhereUniqueInput[]
    connect?: TripTemplateWhereUniqueInput | TripTemplateWhereUniqueInput[]
    update?: TripTemplateUpdateWithWhereUniqueWithoutAgencyInput | TripTemplateUpdateWithWhereUniqueWithoutAgencyInput[]
    updateMany?: TripTemplateUpdateManyWithWhereWithoutAgencyInput | TripTemplateUpdateManyWithWhereWithoutAgencyInput[]
    deleteMany?: TripTemplateScalarWhereInput | TripTemplateScalarWhereInput[]
  }

  export type WalletUncheckedUpdateOneWithoutAgencyNestedInput = {
    create?: XOR<WalletCreateWithoutAgencyInput, WalletUncheckedCreateWithoutAgencyInput>
    connectOrCreate?: WalletCreateOrConnectWithoutAgencyInput
    upsert?: WalletUpsertWithoutAgencyInput
    disconnect?: WalletWhereInput | boolean
    delete?: WalletWhereInput | boolean
    connect?: WalletWhereUniqueInput
    update?: XOR<XOR<WalletUpdateToOneWithWhereWithoutAgencyInput, WalletUpdateWithoutAgencyInput>, WalletUncheckedUpdateWithoutAgencyInput>
  }

  export type PayoutRequestUncheckedUpdateManyWithoutAgencyNestedInput = {
    create?: XOR<PayoutRequestCreateWithoutAgencyInput, PayoutRequestUncheckedCreateWithoutAgencyInput> | PayoutRequestCreateWithoutAgencyInput[] | PayoutRequestUncheckedCreateWithoutAgencyInput[]
    connectOrCreate?: PayoutRequestCreateOrConnectWithoutAgencyInput | PayoutRequestCreateOrConnectWithoutAgencyInput[]
    upsert?: PayoutRequestUpsertWithWhereUniqueWithoutAgencyInput | PayoutRequestUpsertWithWhereUniqueWithoutAgencyInput[]
    createMany?: PayoutRequestCreateManyAgencyInputEnvelope
    set?: PayoutRequestWhereUniqueInput | PayoutRequestWhereUniqueInput[]
    disconnect?: PayoutRequestWhereUniqueInput | PayoutRequestWhereUniqueInput[]
    delete?: PayoutRequestWhereUniqueInput | PayoutRequestWhereUniqueInput[]
    connect?: PayoutRequestWhereUniqueInput | PayoutRequestWhereUniqueInput[]
    update?: PayoutRequestUpdateWithWhereUniqueWithoutAgencyInput | PayoutRequestUpdateWithWhereUniqueWithoutAgencyInput[]
    updateMany?: PayoutRequestUpdateManyWithWhereWithoutAgencyInput | PayoutRequestUpdateManyWithWhereWithoutAgencyInput[]
    deleteMany?: PayoutRequestScalarWhereInput | PayoutRequestScalarWhereInput[]
  }

  export type TripTemplateCreateinclusionsInput = {
    set: string[]
  }

  export type TripTemplateCreateexclusionsInput = {
    set: string[]
  }

  export type TripTemplateCreatechecklistInput = {
    set: string[]
  }

  export type TripTemplateCreateimagesInput = {
    set: string[]
  }

  export type AgencyProfileCreateNestedOneWithoutTemplatesInput = {
    create?: XOR<AgencyProfileCreateWithoutTemplatesInput, AgencyProfileUncheckedCreateWithoutTemplatesInput>
    connectOrCreate?: AgencyProfileCreateOrConnectWithoutTemplatesInput
    connect?: AgencyProfileWhereUniqueInput
  }

  export type TripSessionCreateNestedManyWithoutTemplateInput = {
    create?: XOR<TripSessionCreateWithoutTemplateInput, TripSessionUncheckedCreateWithoutTemplateInput> | TripSessionCreateWithoutTemplateInput[] | TripSessionUncheckedCreateWithoutTemplateInput[]
    connectOrCreate?: TripSessionCreateOrConnectWithoutTemplateInput | TripSessionCreateOrConnectWithoutTemplateInput[]
    createMany?: TripSessionCreateManyTemplateInputEnvelope
    connect?: TripSessionWhereUniqueInput | TripSessionWhereUniqueInput[]
  }

  export type ItineraryDayCreateNestedManyWithoutTemplateInput = {
    create?: XOR<ItineraryDayCreateWithoutTemplateInput, ItineraryDayUncheckedCreateWithoutTemplateInput> | ItineraryDayCreateWithoutTemplateInput[] | ItineraryDayUncheckedCreateWithoutTemplateInput[]
    connectOrCreate?: ItineraryDayCreateOrConnectWithoutTemplateInput | ItineraryDayCreateOrConnectWithoutTemplateInput[]
    createMany?: ItineraryDayCreateManyTemplateInputEnvelope
    connect?: ItineraryDayWhereUniqueInput | ItineraryDayWhereUniqueInput[]
  }

  export type TripSessionUncheckedCreateNestedManyWithoutTemplateInput = {
    create?: XOR<TripSessionCreateWithoutTemplateInput, TripSessionUncheckedCreateWithoutTemplateInput> | TripSessionCreateWithoutTemplateInput[] | TripSessionUncheckedCreateWithoutTemplateInput[]
    connectOrCreate?: TripSessionCreateOrConnectWithoutTemplateInput | TripSessionCreateOrConnectWithoutTemplateInput[]
    createMany?: TripSessionCreateManyTemplateInputEnvelope
    connect?: TripSessionWhereUniqueInput | TripSessionWhereUniqueInput[]
  }

  export type ItineraryDayUncheckedCreateNestedManyWithoutTemplateInput = {
    create?: XOR<ItineraryDayCreateWithoutTemplateInput, ItineraryDayUncheckedCreateWithoutTemplateInput> | ItineraryDayCreateWithoutTemplateInput[] | ItineraryDayUncheckedCreateWithoutTemplateInput[]
    connectOrCreate?: ItineraryDayCreateOrConnectWithoutTemplateInput | ItineraryDayCreateOrConnectWithoutTemplateInput[]
    createMany?: ItineraryDayCreateManyTemplateInputEnvelope
    connect?: ItineraryDayWhereUniqueInput | ItineraryDayWhereUniqueInput[]
  }

  export type EnumTripCategoryFieldUpdateOperationsInput = {
    set?: $Enums.TripCategory
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type TripTemplateUpdateinclusionsInput = {
    set?: string[]
    push?: string | string[]
  }

  export type TripTemplateUpdateexclusionsInput = {
    set?: string[]
    push?: string | string[]
  }

  export type TripTemplateUpdatechecklistInput = {
    set?: string[]
    push?: string | string[]
  }

  export type TripTemplateUpdateimagesInput = {
    set?: string[]
    push?: string | string[]
  }

  export type EnumTripStatusFieldUpdateOperationsInput = {
    set?: $Enums.TripStatus
  }

  export type AgencyProfileUpdateOneRequiredWithoutTemplatesNestedInput = {
    create?: XOR<AgencyProfileCreateWithoutTemplatesInput, AgencyProfileUncheckedCreateWithoutTemplatesInput>
    connectOrCreate?: AgencyProfileCreateOrConnectWithoutTemplatesInput
    upsert?: AgencyProfileUpsertWithoutTemplatesInput
    connect?: AgencyProfileWhereUniqueInput
    update?: XOR<XOR<AgencyProfileUpdateToOneWithWhereWithoutTemplatesInput, AgencyProfileUpdateWithoutTemplatesInput>, AgencyProfileUncheckedUpdateWithoutTemplatesInput>
  }

  export type TripSessionUpdateManyWithoutTemplateNestedInput = {
    create?: XOR<TripSessionCreateWithoutTemplateInput, TripSessionUncheckedCreateWithoutTemplateInput> | TripSessionCreateWithoutTemplateInput[] | TripSessionUncheckedCreateWithoutTemplateInput[]
    connectOrCreate?: TripSessionCreateOrConnectWithoutTemplateInput | TripSessionCreateOrConnectWithoutTemplateInput[]
    upsert?: TripSessionUpsertWithWhereUniqueWithoutTemplateInput | TripSessionUpsertWithWhereUniqueWithoutTemplateInput[]
    createMany?: TripSessionCreateManyTemplateInputEnvelope
    set?: TripSessionWhereUniqueInput | TripSessionWhereUniqueInput[]
    disconnect?: TripSessionWhereUniqueInput | TripSessionWhereUniqueInput[]
    delete?: TripSessionWhereUniqueInput | TripSessionWhereUniqueInput[]
    connect?: TripSessionWhereUniqueInput | TripSessionWhereUniqueInput[]
    update?: TripSessionUpdateWithWhereUniqueWithoutTemplateInput | TripSessionUpdateWithWhereUniqueWithoutTemplateInput[]
    updateMany?: TripSessionUpdateManyWithWhereWithoutTemplateInput | TripSessionUpdateManyWithWhereWithoutTemplateInput[]
    deleteMany?: TripSessionScalarWhereInput | TripSessionScalarWhereInput[]
  }

  export type ItineraryDayUpdateManyWithoutTemplateNestedInput = {
    create?: XOR<ItineraryDayCreateWithoutTemplateInput, ItineraryDayUncheckedCreateWithoutTemplateInput> | ItineraryDayCreateWithoutTemplateInput[] | ItineraryDayUncheckedCreateWithoutTemplateInput[]
    connectOrCreate?: ItineraryDayCreateOrConnectWithoutTemplateInput | ItineraryDayCreateOrConnectWithoutTemplateInput[]
    upsert?: ItineraryDayUpsertWithWhereUniqueWithoutTemplateInput | ItineraryDayUpsertWithWhereUniqueWithoutTemplateInput[]
    createMany?: ItineraryDayCreateManyTemplateInputEnvelope
    set?: ItineraryDayWhereUniqueInput | ItineraryDayWhereUniqueInput[]
    disconnect?: ItineraryDayWhereUniqueInput | ItineraryDayWhereUniqueInput[]
    delete?: ItineraryDayWhereUniqueInput | ItineraryDayWhereUniqueInput[]
    connect?: ItineraryDayWhereUniqueInput | ItineraryDayWhereUniqueInput[]
    update?: ItineraryDayUpdateWithWhereUniqueWithoutTemplateInput | ItineraryDayUpdateWithWhereUniqueWithoutTemplateInput[]
    updateMany?: ItineraryDayUpdateManyWithWhereWithoutTemplateInput | ItineraryDayUpdateManyWithWhereWithoutTemplateInput[]
    deleteMany?: ItineraryDayScalarWhereInput | ItineraryDayScalarWhereInput[]
  }

  export type TripSessionUncheckedUpdateManyWithoutTemplateNestedInput = {
    create?: XOR<TripSessionCreateWithoutTemplateInput, TripSessionUncheckedCreateWithoutTemplateInput> | TripSessionCreateWithoutTemplateInput[] | TripSessionUncheckedCreateWithoutTemplateInput[]
    connectOrCreate?: TripSessionCreateOrConnectWithoutTemplateInput | TripSessionCreateOrConnectWithoutTemplateInput[]
    upsert?: TripSessionUpsertWithWhereUniqueWithoutTemplateInput | TripSessionUpsertWithWhereUniqueWithoutTemplateInput[]
    createMany?: TripSessionCreateManyTemplateInputEnvelope
    set?: TripSessionWhereUniqueInput | TripSessionWhereUniqueInput[]
    disconnect?: TripSessionWhereUniqueInput | TripSessionWhereUniqueInput[]
    delete?: TripSessionWhereUniqueInput | TripSessionWhereUniqueInput[]
    connect?: TripSessionWhereUniqueInput | TripSessionWhereUniqueInput[]
    update?: TripSessionUpdateWithWhereUniqueWithoutTemplateInput | TripSessionUpdateWithWhereUniqueWithoutTemplateInput[]
    updateMany?: TripSessionUpdateManyWithWhereWithoutTemplateInput | TripSessionUpdateManyWithWhereWithoutTemplateInput[]
    deleteMany?: TripSessionScalarWhereInput | TripSessionScalarWhereInput[]
  }

  export type ItineraryDayUncheckedUpdateManyWithoutTemplateNestedInput = {
    create?: XOR<ItineraryDayCreateWithoutTemplateInput, ItineraryDayUncheckedCreateWithoutTemplateInput> | ItineraryDayCreateWithoutTemplateInput[] | ItineraryDayUncheckedCreateWithoutTemplateInput[]
    connectOrCreate?: ItineraryDayCreateOrConnectWithoutTemplateInput | ItineraryDayCreateOrConnectWithoutTemplateInput[]
    upsert?: ItineraryDayUpsertWithWhereUniqueWithoutTemplateInput | ItineraryDayUpsertWithWhereUniqueWithoutTemplateInput[]
    createMany?: ItineraryDayCreateManyTemplateInputEnvelope
    set?: ItineraryDayWhereUniqueInput | ItineraryDayWhereUniqueInput[]
    disconnect?: ItineraryDayWhereUniqueInput | ItineraryDayWhereUniqueInput[]
    delete?: ItineraryDayWhereUniqueInput | ItineraryDayWhereUniqueInput[]
    connect?: ItineraryDayWhereUniqueInput | ItineraryDayWhereUniqueInput[]
    update?: ItineraryDayUpdateWithWhereUniqueWithoutTemplateInput | ItineraryDayUpdateWithWhereUniqueWithoutTemplateInput[]
    updateMany?: ItineraryDayUpdateManyWithWhereWithoutTemplateInput | ItineraryDayUpdateManyWithWhereWithoutTemplateInput[]
    deleteMany?: ItineraryDayScalarWhereInput | ItineraryDayScalarWhereInput[]
  }

  export type ItineraryDayCreateactivitiesInput = {
    set: string[]
  }

  export type TripTemplateCreateNestedOneWithoutItineraryInput = {
    create?: XOR<TripTemplateCreateWithoutItineraryInput, TripTemplateUncheckedCreateWithoutItineraryInput>
    connectOrCreate?: TripTemplateCreateOrConnectWithoutItineraryInput
    connect?: TripTemplateWhereUniqueInput
  }

  export type ItineraryDayUpdateactivitiesInput = {
    set?: string[]
    push?: string | string[]
  }

  export type TripTemplateUpdateOneRequiredWithoutItineraryNestedInput = {
    create?: XOR<TripTemplateCreateWithoutItineraryInput, TripTemplateUncheckedCreateWithoutItineraryInput>
    connectOrCreate?: TripTemplateCreateOrConnectWithoutItineraryInput
    upsert?: TripTemplateUpsertWithoutItineraryInput
    connect?: TripTemplateWhereUniqueInput
    update?: XOR<XOR<TripTemplateUpdateToOneWithWhereWithoutItineraryInput, TripTemplateUpdateWithoutItineraryInput>, TripTemplateUncheckedUpdateWithoutItineraryInput>
  }

  export type TripTemplateCreateNestedOneWithoutSessionsInput = {
    create?: XOR<TripTemplateCreateWithoutSessionsInput, TripTemplateUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: TripTemplateCreateOrConnectWithoutSessionsInput
    connect?: TripTemplateWhereUniqueInput
  }

  export type BookingCreateNestedManyWithoutSessionInput = {
    create?: XOR<BookingCreateWithoutSessionInput, BookingUncheckedCreateWithoutSessionInput> | BookingCreateWithoutSessionInput[] | BookingUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: BookingCreateOrConnectWithoutSessionInput | BookingCreateOrConnectWithoutSessionInput[]
    createMany?: BookingCreateManySessionInputEnvelope
    connect?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
  }

  export type BookingUncheckedCreateNestedManyWithoutSessionInput = {
    create?: XOR<BookingCreateWithoutSessionInput, BookingUncheckedCreateWithoutSessionInput> | BookingCreateWithoutSessionInput[] | BookingUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: BookingCreateOrConnectWithoutSessionInput | BookingCreateOrConnectWithoutSessionInput[]
    createMany?: BookingCreateManySessionInputEnvelope
    connect?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type TripTemplateUpdateOneRequiredWithoutSessionsNestedInput = {
    create?: XOR<TripTemplateCreateWithoutSessionsInput, TripTemplateUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: TripTemplateCreateOrConnectWithoutSessionsInput
    upsert?: TripTemplateUpsertWithoutSessionsInput
    connect?: TripTemplateWhereUniqueInput
    update?: XOR<XOR<TripTemplateUpdateToOneWithWhereWithoutSessionsInput, TripTemplateUpdateWithoutSessionsInput>, TripTemplateUncheckedUpdateWithoutSessionsInput>
  }

  export type BookingUpdateManyWithoutSessionNestedInput = {
    create?: XOR<BookingCreateWithoutSessionInput, BookingUncheckedCreateWithoutSessionInput> | BookingCreateWithoutSessionInput[] | BookingUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: BookingCreateOrConnectWithoutSessionInput | BookingCreateOrConnectWithoutSessionInput[]
    upsert?: BookingUpsertWithWhereUniqueWithoutSessionInput | BookingUpsertWithWhereUniqueWithoutSessionInput[]
    createMany?: BookingCreateManySessionInputEnvelope
    set?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    disconnect?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    delete?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    connect?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    update?: BookingUpdateWithWhereUniqueWithoutSessionInput | BookingUpdateWithWhereUniqueWithoutSessionInput[]
    updateMany?: BookingUpdateManyWithWhereWithoutSessionInput | BookingUpdateManyWithWhereWithoutSessionInput[]
    deleteMany?: BookingScalarWhereInput | BookingScalarWhereInput[]
  }

  export type BookingUncheckedUpdateManyWithoutSessionNestedInput = {
    create?: XOR<BookingCreateWithoutSessionInput, BookingUncheckedCreateWithoutSessionInput> | BookingCreateWithoutSessionInput[] | BookingUncheckedCreateWithoutSessionInput[]
    connectOrCreate?: BookingCreateOrConnectWithoutSessionInput | BookingCreateOrConnectWithoutSessionInput[]
    upsert?: BookingUpsertWithWhereUniqueWithoutSessionInput | BookingUpsertWithWhereUniqueWithoutSessionInput[]
    createMany?: BookingCreateManySessionInputEnvelope
    set?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    disconnect?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    delete?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    connect?: BookingWhereUniqueInput | BookingWhereUniqueInput[]
    update?: BookingUpdateWithWhereUniqueWithoutSessionInput | BookingUpdateWithWhereUniqueWithoutSessionInput[]
    updateMany?: BookingUpdateManyWithWhereWithoutSessionInput | BookingUpdateManyWithWhereWithoutSessionInput[]
    deleteMany?: BookingScalarWhereInput | BookingScalarWhereInput[]
  }

  export type TripSessionCreateNestedOneWithoutBookingsInput = {
    create?: XOR<TripSessionCreateWithoutBookingsInput, TripSessionUncheckedCreateWithoutBookingsInput>
    connectOrCreate?: TripSessionCreateOrConnectWithoutBookingsInput
    connect?: TripSessionWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutBookingsInput = {
    create?: XOR<UserCreateWithoutBookingsInput, UserUncheckedCreateWithoutBookingsInput>
    connectOrCreate?: UserCreateOrConnectWithoutBookingsInput
    connect?: UserWhereUniqueInput
  }

  export type PaymentProofCreateNestedOneWithoutBookingInput = {
    create?: XOR<PaymentProofCreateWithoutBookingInput, PaymentProofUncheckedCreateWithoutBookingInput>
    connectOrCreate?: PaymentProofCreateOrConnectWithoutBookingInput
    connect?: PaymentProofWhereUniqueInput
  }

  export type PaymentProofUncheckedCreateNestedOneWithoutBookingInput = {
    create?: XOR<PaymentProofCreateWithoutBookingInput, PaymentProofUncheckedCreateWithoutBookingInput>
    connectOrCreate?: PaymentProofCreateOrConnectWithoutBookingInput
    connect?: PaymentProofWhereUniqueInput
  }

  export type EnumBookingStatusFieldUpdateOperationsInput = {
    set?: $Enums.BookingStatus
  }

  export type TripSessionUpdateOneRequiredWithoutBookingsNestedInput = {
    create?: XOR<TripSessionCreateWithoutBookingsInput, TripSessionUncheckedCreateWithoutBookingsInput>
    connectOrCreate?: TripSessionCreateOrConnectWithoutBookingsInput
    upsert?: TripSessionUpsertWithoutBookingsInput
    connect?: TripSessionWhereUniqueInput
    update?: XOR<XOR<TripSessionUpdateToOneWithWhereWithoutBookingsInput, TripSessionUpdateWithoutBookingsInput>, TripSessionUncheckedUpdateWithoutBookingsInput>
  }

  export type UserUpdateOneRequiredWithoutBookingsNestedInput = {
    create?: XOR<UserCreateWithoutBookingsInput, UserUncheckedCreateWithoutBookingsInput>
    connectOrCreate?: UserCreateOrConnectWithoutBookingsInput
    upsert?: UserUpsertWithoutBookingsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutBookingsInput, UserUpdateWithoutBookingsInput>, UserUncheckedUpdateWithoutBookingsInput>
  }

  export type PaymentProofUpdateOneWithoutBookingNestedInput = {
    create?: XOR<PaymentProofCreateWithoutBookingInput, PaymentProofUncheckedCreateWithoutBookingInput>
    connectOrCreate?: PaymentProofCreateOrConnectWithoutBookingInput
    upsert?: PaymentProofUpsertWithoutBookingInput
    disconnect?: PaymentProofWhereInput | boolean
    delete?: PaymentProofWhereInput | boolean
    connect?: PaymentProofWhereUniqueInput
    update?: XOR<XOR<PaymentProofUpdateToOneWithWhereWithoutBookingInput, PaymentProofUpdateWithoutBookingInput>, PaymentProofUncheckedUpdateWithoutBookingInput>
  }

  export type PaymentProofUncheckedUpdateOneWithoutBookingNestedInput = {
    create?: XOR<PaymentProofCreateWithoutBookingInput, PaymentProofUncheckedCreateWithoutBookingInput>
    connectOrCreate?: PaymentProofCreateOrConnectWithoutBookingInput
    upsert?: PaymentProofUpsertWithoutBookingInput
    disconnect?: PaymentProofWhereInput | boolean
    delete?: PaymentProofWhereInput | boolean
    connect?: PaymentProofWhereUniqueInput
    update?: XOR<XOR<PaymentProofUpdateToOneWithWhereWithoutBookingInput, PaymentProofUpdateWithoutBookingInput>, PaymentProofUncheckedUpdateWithoutBookingInput>
  }

  export type BookingCreateNestedOneWithoutPaymentProofInput = {
    create?: XOR<BookingCreateWithoutPaymentProofInput, BookingUncheckedCreateWithoutPaymentProofInput>
    connectOrCreate?: BookingCreateOrConnectWithoutPaymentProofInput
    connect?: BookingWhereUniqueInput
  }

  export type BookingUpdateOneRequiredWithoutPaymentProofNestedInput = {
    create?: XOR<BookingCreateWithoutPaymentProofInput, BookingUncheckedCreateWithoutPaymentProofInput>
    connectOrCreate?: BookingCreateOrConnectWithoutPaymentProofInput
    upsert?: BookingUpsertWithoutPaymentProofInput
    connect?: BookingWhereUniqueInput
    update?: XOR<XOR<BookingUpdateToOneWithWhereWithoutPaymentProofInput, BookingUpdateWithoutPaymentProofInput>, BookingUncheckedUpdateWithoutPaymentProofInput>
  }

  export type AgencyProfileCreateNestedOneWithoutWalletInput = {
    create?: XOR<AgencyProfileCreateWithoutWalletInput, AgencyProfileUncheckedCreateWithoutWalletInput>
    connectOrCreate?: AgencyProfileCreateOrConnectWithoutWalletInput
    connect?: AgencyProfileWhereUniqueInput
  }

  export type WalletTransactionCreateNestedManyWithoutWalletInput = {
    create?: XOR<WalletTransactionCreateWithoutWalletInput, WalletTransactionUncheckedCreateWithoutWalletInput> | WalletTransactionCreateWithoutWalletInput[] | WalletTransactionUncheckedCreateWithoutWalletInput[]
    connectOrCreate?: WalletTransactionCreateOrConnectWithoutWalletInput | WalletTransactionCreateOrConnectWithoutWalletInput[]
    createMany?: WalletTransactionCreateManyWalletInputEnvelope
    connect?: WalletTransactionWhereUniqueInput | WalletTransactionWhereUniqueInput[]
  }

  export type WalletTransactionUncheckedCreateNestedManyWithoutWalletInput = {
    create?: XOR<WalletTransactionCreateWithoutWalletInput, WalletTransactionUncheckedCreateWithoutWalletInput> | WalletTransactionCreateWithoutWalletInput[] | WalletTransactionUncheckedCreateWithoutWalletInput[]
    connectOrCreate?: WalletTransactionCreateOrConnectWithoutWalletInput | WalletTransactionCreateOrConnectWithoutWalletInput[]
    createMany?: WalletTransactionCreateManyWalletInputEnvelope
    connect?: WalletTransactionWhereUniqueInput | WalletTransactionWhereUniqueInput[]
  }

  export type AgencyProfileUpdateOneRequiredWithoutWalletNestedInput = {
    create?: XOR<AgencyProfileCreateWithoutWalletInput, AgencyProfileUncheckedCreateWithoutWalletInput>
    connectOrCreate?: AgencyProfileCreateOrConnectWithoutWalletInput
    upsert?: AgencyProfileUpsertWithoutWalletInput
    connect?: AgencyProfileWhereUniqueInput
    update?: XOR<XOR<AgencyProfileUpdateToOneWithWhereWithoutWalletInput, AgencyProfileUpdateWithoutWalletInput>, AgencyProfileUncheckedUpdateWithoutWalletInput>
  }

  export type WalletTransactionUpdateManyWithoutWalletNestedInput = {
    create?: XOR<WalletTransactionCreateWithoutWalletInput, WalletTransactionUncheckedCreateWithoutWalletInput> | WalletTransactionCreateWithoutWalletInput[] | WalletTransactionUncheckedCreateWithoutWalletInput[]
    connectOrCreate?: WalletTransactionCreateOrConnectWithoutWalletInput | WalletTransactionCreateOrConnectWithoutWalletInput[]
    upsert?: WalletTransactionUpsertWithWhereUniqueWithoutWalletInput | WalletTransactionUpsertWithWhereUniqueWithoutWalletInput[]
    createMany?: WalletTransactionCreateManyWalletInputEnvelope
    set?: WalletTransactionWhereUniqueInput | WalletTransactionWhereUniqueInput[]
    disconnect?: WalletTransactionWhereUniqueInput | WalletTransactionWhereUniqueInput[]
    delete?: WalletTransactionWhereUniqueInput | WalletTransactionWhereUniqueInput[]
    connect?: WalletTransactionWhereUniqueInput | WalletTransactionWhereUniqueInput[]
    update?: WalletTransactionUpdateWithWhereUniqueWithoutWalletInput | WalletTransactionUpdateWithWhereUniqueWithoutWalletInput[]
    updateMany?: WalletTransactionUpdateManyWithWhereWithoutWalletInput | WalletTransactionUpdateManyWithWhereWithoutWalletInput[]
    deleteMany?: WalletTransactionScalarWhereInput | WalletTransactionScalarWhereInput[]
  }

  export type WalletTransactionUncheckedUpdateManyWithoutWalletNestedInput = {
    create?: XOR<WalletTransactionCreateWithoutWalletInput, WalletTransactionUncheckedCreateWithoutWalletInput> | WalletTransactionCreateWithoutWalletInput[] | WalletTransactionUncheckedCreateWithoutWalletInput[]
    connectOrCreate?: WalletTransactionCreateOrConnectWithoutWalletInput | WalletTransactionCreateOrConnectWithoutWalletInput[]
    upsert?: WalletTransactionUpsertWithWhereUniqueWithoutWalletInput | WalletTransactionUpsertWithWhereUniqueWithoutWalletInput[]
    createMany?: WalletTransactionCreateManyWalletInputEnvelope
    set?: WalletTransactionWhereUniqueInput | WalletTransactionWhereUniqueInput[]
    disconnect?: WalletTransactionWhereUniqueInput | WalletTransactionWhereUniqueInput[]
    delete?: WalletTransactionWhereUniqueInput | WalletTransactionWhereUniqueInput[]
    connect?: WalletTransactionWhereUniqueInput | WalletTransactionWhereUniqueInput[]
    update?: WalletTransactionUpdateWithWhereUniqueWithoutWalletInput | WalletTransactionUpdateWithWhereUniqueWithoutWalletInput[]
    updateMany?: WalletTransactionUpdateManyWithWhereWithoutWalletInput | WalletTransactionUpdateManyWithWhereWithoutWalletInput[]
    deleteMany?: WalletTransactionScalarWhereInput | WalletTransactionScalarWhereInput[]
  }

  export type WalletCreateNestedOneWithoutTransactionsInput = {
    create?: XOR<WalletCreateWithoutTransactionsInput, WalletUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: WalletCreateOrConnectWithoutTransactionsInput
    connect?: WalletWhereUniqueInput
  }

  export type EnumTransactionTypeFieldUpdateOperationsInput = {
    set?: $Enums.TransactionType
  }

  export type WalletUpdateOneRequiredWithoutTransactionsNestedInput = {
    create?: XOR<WalletCreateWithoutTransactionsInput, WalletUncheckedCreateWithoutTransactionsInput>
    connectOrCreate?: WalletCreateOrConnectWithoutTransactionsInput
    upsert?: WalletUpsertWithoutTransactionsInput
    connect?: WalletWhereUniqueInput
    update?: XOR<XOR<WalletUpdateToOneWithWhereWithoutTransactionsInput, WalletUpdateWithoutTransactionsInput>, WalletUncheckedUpdateWithoutTransactionsInput>
  }

  export type AgencyProfileCreateNestedOneWithoutPayoutRequestsInput = {
    create?: XOR<AgencyProfileCreateWithoutPayoutRequestsInput, AgencyProfileUncheckedCreateWithoutPayoutRequestsInput>
    connectOrCreate?: AgencyProfileCreateOrConnectWithoutPayoutRequestsInput
    connect?: AgencyProfileWhereUniqueInput
  }

  export type EnumPayoutStatusFieldUpdateOperationsInput = {
    set?: $Enums.PayoutStatus
  }

  export type AgencyProfileUpdateOneRequiredWithoutPayoutRequestsNestedInput = {
    create?: XOR<AgencyProfileCreateWithoutPayoutRequestsInput, AgencyProfileUncheckedCreateWithoutPayoutRequestsInput>
    connectOrCreate?: AgencyProfileCreateOrConnectWithoutPayoutRequestsInput
    upsert?: AgencyProfileUpsertWithoutPayoutRequestsInput
    connect?: AgencyProfileWhereUniqueInput
    update?: XOR<XOR<AgencyProfileUpdateToOneWithWhereWithoutPayoutRequestsInput, AgencyProfileUpdateWithoutPayoutRequestsInput>, AgencyProfileUncheckedUpdateWithoutPayoutRequestsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedEnumVerificationStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.VerificationStatus | EnumVerificationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.VerificationStatus[] | ListEnumVerificationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.VerificationStatus[] | ListEnumVerificationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumVerificationStatusFilter<$PrismaModel> | $Enums.VerificationStatus
  }

  export type NestedEnumSubscriptionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusFilter<$PrismaModel> | $Enums.SubscriptionStatus
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedEnumVerificationStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.VerificationStatus | EnumVerificationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.VerificationStatus[] | ListEnumVerificationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.VerificationStatus[] | ListEnumVerificationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumVerificationStatusWithAggregatesFilter<$PrismaModel> | $Enums.VerificationStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumVerificationStatusFilter<$PrismaModel>
    _max?: NestedEnumVerificationStatusFilter<$PrismaModel>
  }

  export type NestedEnumSubscriptionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubscriptionStatus | EnumSubscriptionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubscriptionStatus[] | ListEnumSubscriptionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubscriptionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SubscriptionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
    _max?: NestedEnumSubscriptionStatusFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedEnumTripCategoryFilter<$PrismaModel = never> = {
    equals?: $Enums.TripCategory | EnumTripCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.TripCategory[] | ListEnumTripCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.TripCategory[] | ListEnumTripCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumTripCategoryFilter<$PrismaModel> | $Enums.TripCategory
  }

  export type NestedEnumTripStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TripStatus | EnumTripStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TripStatus[] | ListEnumTripStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TripStatus[] | ListEnumTripStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTripStatusFilter<$PrismaModel> | $Enums.TripStatus
  }

  export type NestedEnumTripCategoryWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TripCategory | EnumTripCategoryFieldRefInput<$PrismaModel>
    in?: $Enums.TripCategory[] | ListEnumTripCategoryFieldRefInput<$PrismaModel>
    notIn?: $Enums.TripCategory[] | ListEnumTripCategoryFieldRefInput<$PrismaModel>
    not?: NestedEnumTripCategoryWithAggregatesFilter<$PrismaModel> | $Enums.TripCategory
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTripCategoryFilter<$PrismaModel>
    _max?: NestedEnumTripCategoryFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedEnumTripStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TripStatus | EnumTripStatusFieldRefInput<$PrismaModel>
    in?: $Enums.TripStatus[] | ListEnumTripStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.TripStatus[] | ListEnumTripStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumTripStatusWithAggregatesFilter<$PrismaModel> | $Enums.TripStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTripStatusFilter<$PrismaModel>
    _max?: NestedEnumTripStatusFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedEnumBookingStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.BookingStatus | EnumBookingStatusFieldRefInput<$PrismaModel>
    in?: $Enums.BookingStatus[] | ListEnumBookingStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.BookingStatus[] | ListEnumBookingStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumBookingStatusFilter<$PrismaModel> | $Enums.BookingStatus
  }

  export type NestedEnumBookingStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.BookingStatus | EnumBookingStatusFieldRefInput<$PrismaModel>
    in?: $Enums.BookingStatus[] | ListEnumBookingStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.BookingStatus[] | ListEnumBookingStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumBookingStatusWithAggregatesFilter<$PrismaModel> | $Enums.BookingStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumBookingStatusFilter<$PrismaModel>
    _max?: NestedEnumBookingStatusFilter<$PrismaModel>
  }

  export type NestedEnumTransactionTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeFilter<$PrismaModel> | $Enums.TransactionType
  }

  export type NestedEnumTransactionTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TransactionType | EnumTransactionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.TransactionType[] | ListEnumTransactionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumTransactionTypeWithAggregatesFilter<$PrismaModel> | $Enums.TransactionType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumTransactionTypeFilter<$PrismaModel>
    _max?: NestedEnumTransactionTypeFilter<$PrismaModel>
  }

  export type NestedEnumPayoutStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.PayoutStatus | EnumPayoutStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PayoutStatus[] | ListEnumPayoutStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PayoutStatus[] | ListEnumPayoutStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPayoutStatusFilter<$PrismaModel> | $Enums.PayoutStatus
  }

  export type NestedEnumPayoutStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.PayoutStatus | EnumPayoutStatusFieldRefInput<$PrismaModel>
    in?: $Enums.PayoutStatus[] | ListEnumPayoutStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.PayoutStatus[] | ListEnumPayoutStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumPayoutStatusWithAggregatesFilter<$PrismaModel> | $Enums.PayoutStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumPayoutStatusFilter<$PrismaModel>
    _max?: NestedEnumPayoutStatusFilter<$PrismaModel>
  }

  export type AgencyProfileCreateWithoutUserInput = {
    id?: string
    companyName: string
    ice: string
    patente: string
    rib: string
    verificationStatus?: $Enums.VerificationStatus
    bio?: string | null
    logo?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    trialEndsAt?: Date | string | null
    subscriptionEndsAt?: Date | string | null
    templates?: TripTemplateCreateNestedManyWithoutAgencyInput
    wallet?: WalletCreateNestedOneWithoutAgencyInput
    payoutRequests?: PayoutRequestCreateNestedManyWithoutAgencyInput
  }

  export type AgencyProfileUncheckedCreateWithoutUserInput = {
    id?: string
    companyName: string
    ice: string
    patente: string
    rib: string
    verificationStatus?: $Enums.VerificationStatus
    bio?: string | null
    logo?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    trialEndsAt?: Date | string | null
    subscriptionEndsAt?: Date | string | null
    templates?: TripTemplateUncheckedCreateNestedManyWithoutAgencyInput
    wallet?: WalletUncheckedCreateNestedOneWithoutAgencyInput
    payoutRequests?: PayoutRequestUncheckedCreateNestedManyWithoutAgencyInput
  }

  export type AgencyProfileCreateOrConnectWithoutUserInput = {
    where: AgencyProfileWhereUniqueInput
    create: XOR<AgencyProfileCreateWithoutUserInput, AgencyProfileUncheckedCreateWithoutUserInput>
  }

  export type BookingCreateWithoutTravelerInput = {
    id?: string
    bookingDate?: Date | string
    status?: $Enums.BookingStatus
    totalAmount: number
    guestsCount: number
    paymentProofId?: string | null
    session: TripSessionCreateNestedOneWithoutBookingsInput
    paymentProof?: PaymentProofCreateNestedOneWithoutBookingInput
  }

  export type BookingUncheckedCreateWithoutTravelerInput = {
    id?: string
    sessionId: string
    bookingDate?: Date | string
    status?: $Enums.BookingStatus
    totalAmount: number
    guestsCount: number
    paymentProofId?: string | null
    paymentProof?: PaymentProofUncheckedCreateNestedOneWithoutBookingInput
  }

  export type BookingCreateOrConnectWithoutTravelerInput = {
    where: BookingWhereUniqueInput
    create: XOR<BookingCreateWithoutTravelerInput, BookingUncheckedCreateWithoutTravelerInput>
  }

  export type BookingCreateManyTravelerInputEnvelope = {
    data: BookingCreateManyTravelerInput | BookingCreateManyTravelerInput[]
    skipDuplicates?: boolean
  }

  export type AgencyProfileUpsertWithoutUserInput = {
    update: XOR<AgencyProfileUpdateWithoutUserInput, AgencyProfileUncheckedUpdateWithoutUserInput>
    create: XOR<AgencyProfileCreateWithoutUserInput, AgencyProfileUncheckedCreateWithoutUserInput>
    where?: AgencyProfileWhereInput
  }

  export type AgencyProfileUpdateToOneWithWhereWithoutUserInput = {
    where?: AgencyProfileWhereInput
    data: XOR<AgencyProfileUpdateWithoutUserInput, AgencyProfileUncheckedUpdateWithoutUserInput>
  }

  export type AgencyProfileUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    ice?: StringFieldUpdateOperationsInput | string
    patente?: StringFieldUpdateOperationsInput | string
    rib?: StringFieldUpdateOperationsInput | string
    verificationStatus?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    logo?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subscriptionEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    templates?: TripTemplateUpdateManyWithoutAgencyNestedInput
    wallet?: WalletUpdateOneWithoutAgencyNestedInput
    payoutRequests?: PayoutRequestUpdateManyWithoutAgencyNestedInput
  }

  export type AgencyProfileUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    ice?: StringFieldUpdateOperationsInput | string
    patente?: StringFieldUpdateOperationsInput | string
    rib?: StringFieldUpdateOperationsInput | string
    verificationStatus?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    logo?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subscriptionEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    templates?: TripTemplateUncheckedUpdateManyWithoutAgencyNestedInput
    wallet?: WalletUncheckedUpdateOneWithoutAgencyNestedInput
    payoutRequests?: PayoutRequestUncheckedUpdateManyWithoutAgencyNestedInput
  }

  export type BookingUpsertWithWhereUniqueWithoutTravelerInput = {
    where: BookingWhereUniqueInput
    update: XOR<BookingUpdateWithoutTravelerInput, BookingUncheckedUpdateWithoutTravelerInput>
    create: XOR<BookingCreateWithoutTravelerInput, BookingUncheckedCreateWithoutTravelerInput>
  }

  export type BookingUpdateWithWhereUniqueWithoutTravelerInput = {
    where: BookingWhereUniqueInput
    data: XOR<BookingUpdateWithoutTravelerInput, BookingUncheckedUpdateWithoutTravelerInput>
  }

  export type BookingUpdateManyWithWhereWithoutTravelerInput = {
    where: BookingScalarWhereInput
    data: XOR<BookingUpdateManyMutationInput, BookingUncheckedUpdateManyWithoutTravelerInput>
  }

  export type BookingScalarWhereInput = {
    AND?: BookingScalarWhereInput | BookingScalarWhereInput[]
    OR?: BookingScalarWhereInput[]
    NOT?: BookingScalarWhereInput | BookingScalarWhereInput[]
    id?: StringFilter<"Booking"> | string
    sessionId?: StringFilter<"Booking"> | string
    travelerId?: StringFilter<"Booking"> | string
    bookingDate?: DateTimeFilter<"Booking"> | Date | string
    status?: EnumBookingStatusFilter<"Booking"> | $Enums.BookingStatus
    totalAmount?: FloatFilter<"Booking"> | number
    guestsCount?: IntFilter<"Booking"> | number
    paymentProofId?: StringNullableFilter<"Booking"> | string | null
  }

  export type UserCreateWithoutAgencyProfileInput = {
    id?: string
    name?: string | null
    email: string
    password: string
    role?: $Enums.UserRole
    avatar?: string | null
    isEmailVerified?: boolean
    otp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    bookings?: BookingCreateNestedManyWithoutTravelerInput
  }

  export type UserUncheckedCreateWithoutAgencyProfileInput = {
    id?: string
    name?: string | null
    email: string
    password: string
    role?: $Enums.UserRole
    avatar?: string | null
    isEmailVerified?: boolean
    otp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    bookings?: BookingUncheckedCreateNestedManyWithoutTravelerInput
  }

  export type UserCreateOrConnectWithoutAgencyProfileInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAgencyProfileInput, UserUncheckedCreateWithoutAgencyProfileInput>
  }

  export type TripTemplateCreateWithoutAgencyInput = {
    id?: string
    title: string
    description: string
    category: $Enums.TripCategory
    startLocation: string
    durationDays: number
    durationNights: number
    inclusions?: TripTemplateCreateinclusionsInput | string[]
    exclusions?: TripTemplateCreateexclusionsInput | string[]
    checklist?: TripTemplateCreatechecklistInput | string[]
    images?: TripTemplateCreateimagesInput | string[]
    status?: $Enums.TripStatus
    featured?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: TripSessionCreateNestedManyWithoutTemplateInput
    itinerary?: ItineraryDayCreateNestedManyWithoutTemplateInput
  }

  export type TripTemplateUncheckedCreateWithoutAgencyInput = {
    id?: string
    title: string
    description: string
    category: $Enums.TripCategory
    startLocation: string
    durationDays: number
    durationNights: number
    inclusions?: TripTemplateCreateinclusionsInput | string[]
    exclusions?: TripTemplateCreateexclusionsInput | string[]
    checklist?: TripTemplateCreatechecklistInput | string[]
    images?: TripTemplateCreateimagesInput | string[]
    status?: $Enums.TripStatus
    featured?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: TripSessionUncheckedCreateNestedManyWithoutTemplateInput
    itinerary?: ItineraryDayUncheckedCreateNestedManyWithoutTemplateInput
  }

  export type TripTemplateCreateOrConnectWithoutAgencyInput = {
    where: TripTemplateWhereUniqueInput
    create: XOR<TripTemplateCreateWithoutAgencyInput, TripTemplateUncheckedCreateWithoutAgencyInput>
  }

  export type TripTemplateCreateManyAgencyInputEnvelope = {
    data: TripTemplateCreateManyAgencyInput | TripTemplateCreateManyAgencyInput[]
    skipDuplicates?: boolean
  }

  export type WalletCreateWithoutAgencyInput = {
    id?: string
    availableBalance?: number
    pendingBalance?: number
    transactions?: WalletTransactionCreateNestedManyWithoutWalletInput
  }

  export type WalletUncheckedCreateWithoutAgencyInput = {
    id?: string
    availableBalance?: number
    pendingBalance?: number
    transactions?: WalletTransactionUncheckedCreateNestedManyWithoutWalletInput
  }

  export type WalletCreateOrConnectWithoutAgencyInput = {
    where: WalletWhereUniqueInput
    create: XOR<WalletCreateWithoutAgencyInput, WalletUncheckedCreateWithoutAgencyInput>
  }

  export type PayoutRequestCreateWithoutAgencyInput = {
    id?: string
    amount: number
    status?: $Enums.PayoutStatus
    requestedAt?: Date | string
    processedAt?: Date | string | null
    bankDetails: string
  }

  export type PayoutRequestUncheckedCreateWithoutAgencyInput = {
    id?: string
    amount: number
    status?: $Enums.PayoutStatus
    requestedAt?: Date | string
    processedAt?: Date | string | null
    bankDetails: string
  }

  export type PayoutRequestCreateOrConnectWithoutAgencyInput = {
    where: PayoutRequestWhereUniqueInput
    create: XOR<PayoutRequestCreateWithoutAgencyInput, PayoutRequestUncheckedCreateWithoutAgencyInput>
  }

  export type PayoutRequestCreateManyAgencyInputEnvelope = {
    data: PayoutRequestCreateManyAgencyInput | PayoutRequestCreateManyAgencyInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutAgencyProfileInput = {
    update: XOR<UserUpdateWithoutAgencyProfileInput, UserUncheckedUpdateWithoutAgencyProfileInput>
    create: XOR<UserCreateWithoutAgencyProfileInput, UserUncheckedCreateWithoutAgencyProfileInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAgencyProfileInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAgencyProfileInput, UserUncheckedUpdateWithoutAgencyProfileInput>
  }

  export type UserUpdateWithoutAgencyProfileInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    avatar?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    otp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    bookings?: BookingUpdateManyWithoutTravelerNestedInput
  }

  export type UserUncheckedUpdateWithoutAgencyProfileInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    avatar?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    otp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    bookings?: BookingUncheckedUpdateManyWithoutTravelerNestedInput
  }

  export type TripTemplateUpsertWithWhereUniqueWithoutAgencyInput = {
    where: TripTemplateWhereUniqueInput
    update: XOR<TripTemplateUpdateWithoutAgencyInput, TripTemplateUncheckedUpdateWithoutAgencyInput>
    create: XOR<TripTemplateCreateWithoutAgencyInput, TripTemplateUncheckedCreateWithoutAgencyInput>
  }

  export type TripTemplateUpdateWithWhereUniqueWithoutAgencyInput = {
    where: TripTemplateWhereUniqueInput
    data: XOR<TripTemplateUpdateWithoutAgencyInput, TripTemplateUncheckedUpdateWithoutAgencyInput>
  }

  export type TripTemplateUpdateManyWithWhereWithoutAgencyInput = {
    where: TripTemplateScalarWhereInput
    data: XOR<TripTemplateUpdateManyMutationInput, TripTemplateUncheckedUpdateManyWithoutAgencyInput>
  }

  export type TripTemplateScalarWhereInput = {
    AND?: TripTemplateScalarWhereInput | TripTemplateScalarWhereInput[]
    OR?: TripTemplateScalarWhereInput[]
    NOT?: TripTemplateScalarWhereInput | TripTemplateScalarWhereInput[]
    id?: StringFilter<"TripTemplate"> | string
    agencyId?: StringFilter<"TripTemplate"> | string
    title?: StringFilter<"TripTemplate"> | string
    description?: StringFilter<"TripTemplate"> | string
    category?: EnumTripCategoryFilter<"TripTemplate"> | $Enums.TripCategory
    startLocation?: StringFilter<"TripTemplate"> | string
    durationDays?: IntFilter<"TripTemplate"> | number
    durationNights?: IntFilter<"TripTemplate"> | number
    inclusions?: StringNullableListFilter<"TripTemplate">
    exclusions?: StringNullableListFilter<"TripTemplate">
    checklist?: StringNullableListFilter<"TripTemplate">
    images?: StringNullableListFilter<"TripTemplate">
    status?: EnumTripStatusFilter<"TripTemplate"> | $Enums.TripStatus
    featured?: BoolFilter<"TripTemplate"> | boolean
    createdAt?: DateTimeFilter<"TripTemplate"> | Date | string
    updatedAt?: DateTimeFilter<"TripTemplate"> | Date | string
  }

  export type WalletUpsertWithoutAgencyInput = {
    update: XOR<WalletUpdateWithoutAgencyInput, WalletUncheckedUpdateWithoutAgencyInput>
    create: XOR<WalletCreateWithoutAgencyInput, WalletUncheckedCreateWithoutAgencyInput>
    where?: WalletWhereInput
  }

  export type WalletUpdateToOneWithWhereWithoutAgencyInput = {
    where?: WalletWhereInput
    data: XOR<WalletUpdateWithoutAgencyInput, WalletUncheckedUpdateWithoutAgencyInput>
  }

  export type WalletUpdateWithoutAgencyInput = {
    id?: StringFieldUpdateOperationsInput | string
    availableBalance?: FloatFieldUpdateOperationsInput | number
    pendingBalance?: FloatFieldUpdateOperationsInput | number
    transactions?: WalletTransactionUpdateManyWithoutWalletNestedInput
  }

  export type WalletUncheckedUpdateWithoutAgencyInput = {
    id?: StringFieldUpdateOperationsInput | string
    availableBalance?: FloatFieldUpdateOperationsInput | number
    pendingBalance?: FloatFieldUpdateOperationsInput | number
    transactions?: WalletTransactionUncheckedUpdateManyWithoutWalletNestedInput
  }

  export type PayoutRequestUpsertWithWhereUniqueWithoutAgencyInput = {
    where: PayoutRequestWhereUniqueInput
    update: XOR<PayoutRequestUpdateWithoutAgencyInput, PayoutRequestUncheckedUpdateWithoutAgencyInput>
    create: XOR<PayoutRequestCreateWithoutAgencyInput, PayoutRequestUncheckedCreateWithoutAgencyInput>
  }

  export type PayoutRequestUpdateWithWhereUniqueWithoutAgencyInput = {
    where: PayoutRequestWhereUniqueInput
    data: XOR<PayoutRequestUpdateWithoutAgencyInput, PayoutRequestUncheckedUpdateWithoutAgencyInput>
  }

  export type PayoutRequestUpdateManyWithWhereWithoutAgencyInput = {
    where: PayoutRequestScalarWhereInput
    data: XOR<PayoutRequestUpdateManyMutationInput, PayoutRequestUncheckedUpdateManyWithoutAgencyInput>
  }

  export type PayoutRequestScalarWhereInput = {
    AND?: PayoutRequestScalarWhereInput | PayoutRequestScalarWhereInput[]
    OR?: PayoutRequestScalarWhereInput[]
    NOT?: PayoutRequestScalarWhereInput | PayoutRequestScalarWhereInput[]
    id?: StringFilter<"PayoutRequest"> | string
    agencyId?: StringFilter<"PayoutRequest"> | string
    amount?: FloatFilter<"PayoutRequest"> | number
    status?: EnumPayoutStatusFilter<"PayoutRequest"> | $Enums.PayoutStatus
    requestedAt?: DateTimeFilter<"PayoutRequest"> | Date | string
    processedAt?: DateTimeNullableFilter<"PayoutRequest"> | Date | string | null
    bankDetails?: StringFilter<"PayoutRequest"> | string
  }

  export type AgencyProfileCreateWithoutTemplatesInput = {
    id?: string
    companyName: string
    ice: string
    patente: string
    rib: string
    verificationStatus?: $Enums.VerificationStatus
    bio?: string | null
    logo?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    trialEndsAt?: Date | string | null
    subscriptionEndsAt?: Date | string | null
    user: UserCreateNestedOneWithoutAgencyProfileInput
    wallet?: WalletCreateNestedOneWithoutAgencyInput
    payoutRequests?: PayoutRequestCreateNestedManyWithoutAgencyInput
  }

  export type AgencyProfileUncheckedCreateWithoutTemplatesInput = {
    id?: string
    userId: string
    companyName: string
    ice: string
    patente: string
    rib: string
    verificationStatus?: $Enums.VerificationStatus
    bio?: string | null
    logo?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    trialEndsAt?: Date | string | null
    subscriptionEndsAt?: Date | string | null
    wallet?: WalletUncheckedCreateNestedOneWithoutAgencyInput
    payoutRequests?: PayoutRequestUncheckedCreateNestedManyWithoutAgencyInput
  }

  export type AgencyProfileCreateOrConnectWithoutTemplatesInput = {
    where: AgencyProfileWhereUniqueInput
    create: XOR<AgencyProfileCreateWithoutTemplatesInput, AgencyProfileUncheckedCreateWithoutTemplatesInput>
  }

  export type TripSessionCreateWithoutTemplateInput = {
    id?: string
    startDate: Date | string
    endDate: Date | string
    price: number
    deposit?: number
    totalSeats: number
    availableSeats: number
    status?: string
    bookings?: BookingCreateNestedManyWithoutSessionInput
  }

  export type TripSessionUncheckedCreateWithoutTemplateInput = {
    id?: string
    startDate: Date | string
    endDate: Date | string
    price: number
    deposit?: number
    totalSeats: number
    availableSeats: number
    status?: string
    bookings?: BookingUncheckedCreateNestedManyWithoutSessionInput
  }

  export type TripSessionCreateOrConnectWithoutTemplateInput = {
    where: TripSessionWhereUniqueInput
    create: XOR<TripSessionCreateWithoutTemplateInput, TripSessionUncheckedCreateWithoutTemplateInput>
  }

  export type TripSessionCreateManyTemplateInputEnvelope = {
    data: TripSessionCreateManyTemplateInput | TripSessionCreateManyTemplateInput[]
    skipDuplicates?: boolean
  }

  export type ItineraryDayCreateWithoutTemplateInput = {
    id?: string
    dayNumber: number
    title?: string | null
    description: string
    activities?: ItineraryDayCreateactivitiesInput | string[]
  }

  export type ItineraryDayUncheckedCreateWithoutTemplateInput = {
    id?: string
    dayNumber: number
    title?: string | null
    description: string
    activities?: ItineraryDayCreateactivitiesInput | string[]
  }

  export type ItineraryDayCreateOrConnectWithoutTemplateInput = {
    where: ItineraryDayWhereUniqueInput
    create: XOR<ItineraryDayCreateWithoutTemplateInput, ItineraryDayUncheckedCreateWithoutTemplateInput>
  }

  export type ItineraryDayCreateManyTemplateInputEnvelope = {
    data: ItineraryDayCreateManyTemplateInput | ItineraryDayCreateManyTemplateInput[]
    skipDuplicates?: boolean
  }

  export type AgencyProfileUpsertWithoutTemplatesInput = {
    update: XOR<AgencyProfileUpdateWithoutTemplatesInput, AgencyProfileUncheckedUpdateWithoutTemplatesInput>
    create: XOR<AgencyProfileCreateWithoutTemplatesInput, AgencyProfileUncheckedCreateWithoutTemplatesInput>
    where?: AgencyProfileWhereInput
  }

  export type AgencyProfileUpdateToOneWithWhereWithoutTemplatesInput = {
    where?: AgencyProfileWhereInput
    data: XOR<AgencyProfileUpdateWithoutTemplatesInput, AgencyProfileUncheckedUpdateWithoutTemplatesInput>
  }

  export type AgencyProfileUpdateWithoutTemplatesInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    ice?: StringFieldUpdateOperationsInput | string
    patente?: StringFieldUpdateOperationsInput | string
    rib?: StringFieldUpdateOperationsInput | string
    verificationStatus?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    logo?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subscriptionEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneRequiredWithoutAgencyProfileNestedInput
    wallet?: WalletUpdateOneWithoutAgencyNestedInput
    payoutRequests?: PayoutRequestUpdateManyWithoutAgencyNestedInput
  }

  export type AgencyProfileUncheckedUpdateWithoutTemplatesInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    ice?: StringFieldUpdateOperationsInput | string
    patente?: StringFieldUpdateOperationsInput | string
    rib?: StringFieldUpdateOperationsInput | string
    verificationStatus?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    logo?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subscriptionEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    wallet?: WalletUncheckedUpdateOneWithoutAgencyNestedInput
    payoutRequests?: PayoutRequestUncheckedUpdateManyWithoutAgencyNestedInput
  }

  export type TripSessionUpsertWithWhereUniqueWithoutTemplateInput = {
    where: TripSessionWhereUniqueInput
    update: XOR<TripSessionUpdateWithoutTemplateInput, TripSessionUncheckedUpdateWithoutTemplateInput>
    create: XOR<TripSessionCreateWithoutTemplateInput, TripSessionUncheckedCreateWithoutTemplateInput>
  }

  export type TripSessionUpdateWithWhereUniqueWithoutTemplateInput = {
    where: TripSessionWhereUniqueInput
    data: XOR<TripSessionUpdateWithoutTemplateInput, TripSessionUncheckedUpdateWithoutTemplateInput>
  }

  export type TripSessionUpdateManyWithWhereWithoutTemplateInput = {
    where: TripSessionScalarWhereInput
    data: XOR<TripSessionUpdateManyMutationInput, TripSessionUncheckedUpdateManyWithoutTemplateInput>
  }

  export type TripSessionScalarWhereInput = {
    AND?: TripSessionScalarWhereInput | TripSessionScalarWhereInput[]
    OR?: TripSessionScalarWhereInput[]
    NOT?: TripSessionScalarWhereInput | TripSessionScalarWhereInput[]
    id?: StringFilter<"TripSession"> | string
    templateId?: StringFilter<"TripSession"> | string
    startDate?: DateTimeFilter<"TripSession"> | Date | string
    endDate?: DateTimeFilter<"TripSession"> | Date | string
    price?: FloatFilter<"TripSession"> | number
    deposit?: FloatFilter<"TripSession"> | number
    totalSeats?: IntFilter<"TripSession"> | number
    availableSeats?: IntFilter<"TripSession"> | number
    status?: StringFilter<"TripSession"> | string
  }

  export type ItineraryDayUpsertWithWhereUniqueWithoutTemplateInput = {
    where: ItineraryDayWhereUniqueInput
    update: XOR<ItineraryDayUpdateWithoutTemplateInput, ItineraryDayUncheckedUpdateWithoutTemplateInput>
    create: XOR<ItineraryDayCreateWithoutTemplateInput, ItineraryDayUncheckedCreateWithoutTemplateInput>
  }

  export type ItineraryDayUpdateWithWhereUniqueWithoutTemplateInput = {
    where: ItineraryDayWhereUniqueInput
    data: XOR<ItineraryDayUpdateWithoutTemplateInput, ItineraryDayUncheckedUpdateWithoutTemplateInput>
  }

  export type ItineraryDayUpdateManyWithWhereWithoutTemplateInput = {
    where: ItineraryDayScalarWhereInput
    data: XOR<ItineraryDayUpdateManyMutationInput, ItineraryDayUncheckedUpdateManyWithoutTemplateInput>
  }

  export type ItineraryDayScalarWhereInput = {
    AND?: ItineraryDayScalarWhereInput | ItineraryDayScalarWhereInput[]
    OR?: ItineraryDayScalarWhereInput[]
    NOT?: ItineraryDayScalarWhereInput | ItineraryDayScalarWhereInput[]
    id?: StringFilter<"ItineraryDay"> | string
    templateId?: StringFilter<"ItineraryDay"> | string
    dayNumber?: IntFilter<"ItineraryDay"> | number
    title?: StringNullableFilter<"ItineraryDay"> | string | null
    description?: StringFilter<"ItineraryDay"> | string
    activities?: StringNullableListFilter<"ItineraryDay">
  }

  export type TripTemplateCreateWithoutItineraryInput = {
    id?: string
    title: string
    description: string
    category: $Enums.TripCategory
    startLocation: string
    durationDays: number
    durationNights: number
    inclusions?: TripTemplateCreateinclusionsInput | string[]
    exclusions?: TripTemplateCreateexclusionsInput | string[]
    checklist?: TripTemplateCreatechecklistInput | string[]
    images?: TripTemplateCreateimagesInput | string[]
    status?: $Enums.TripStatus
    featured?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    agency: AgencyProfileCreateNestedOneWithoutTemplatesInput
    sessions?: TripSessionCreateNestedManyWithoutTemplateInput
  }

  export type TripTemplateUncheckedCreateWithoutItineraryInput = {
    id?: string
    agencyId: string
    title: string
    description: string
    category: $Enums.TripCategory
    startLocation: string
    durationDays: number
    durationNights: number
    inclusions?: TripTemplateCreateinclusionsInput | string[]
    exclusions?: TripTemplateCreateexclusionsInput | string[]
    checklist?: TripTemplateCreatechecklistInput | string[]
    images?: TripTemplateCreateimagesInput | string[]
    status?: $Enums.TripStatus
    featured?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    sessions?: TripSessionUncheckedCreateNestedManyWithoutTemplateInput
  }

  export type TripTemplateCreateOrConnectWithoutItineraryInput = {
    where: TripTemplateWhereUniqueInput
    create: XOR<TripTemplateCreateWithoutItineraryInput, TripTemplateUncheckedCreateWithoutItineraryInput>
  }

  export type TripTemplateUpsertWithoutItineraryInput = {
    update: XOR<TripTemplateUpdateWithoutItineraryInput, TripTemplateUncheckedUpdateWithoutItineraryInput>
    create: XOR<TripTemplateCreateWithoutItineraryInput, TripTemplateUncheckedCreateWithoutItineraryInput>
    where?: TripTemplateWhereInput
  }

  export type TripTemplateUpdateToOneWithWhereWithoutItineraryInput = {
    where?: TripTemplateWhereInput
    data: XOR<TripTemplateUpdateWithoutItineraryInput, TripTemplateUncheckedUpdateWithoutItineraryInput>
  }

  export type TripTemplateUpdateWithoutItineraryInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumTripCategoryFieldUpdateOperationsInput | $Enums.TripCategory
    startLocation?: StringFieldUpdateOperationsInput | string
    durationDays?: IntFieldUpdateOperationsInput | number
    durationNights?: IntFieldUpdateOperationsInput | number
    inclusions?: TripTemplateUpdateinclusionsInput | string[]
    exclusions?: TripTemplateUpdateexclusionsInput | string[]
    checklist?: TripTemplateUpdatechecklistInput | string[]
    images?: TripTemplateUpdateimagesInput | string[]
    status?: EnumTripStatusFieldUpdateOperationsInput | $Enums.TripStatus
    featured?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    agency?: AgencyProfileUpdateOneRequiredWithoutTemplatesNestedInput
    sessions?: TripSessionUpdateManyWithoutTemplateNestedInput
  }

  export type TripTemplateUncheckedUpdateWithoutItineraryInput = {
    id?: StringFieldUpdateOperationsInput | string
    agencyId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumTripCategoryFieldUpdateOperationsInput | $Enums.TripCategory
    startLocation?: StringFieldUpdateOperationsInput | string
    durationDays?: IntFieldUpdateOperationsInput | number
    durationNights?: IntFieldUpdateOperationsInput | number
    inclusions?: TripTemplateUpdateinclusionsInput | string[]
    exclusions?: TripTemplateUpdateexclusionsInput | string[]
    checklist?: TripTemplateUpdatechecklistInput | string[]
    images?: TripTemplateUpdateimagesInput | string[]
    status?: EnumTripStatusFieldUpdateOperationsInput | $Enums.TripStatus
    featured?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: TripSessionUncheckedUpdateManyWithoutTemplateNestedInput
  }

  export type TripTemplateCreateWithoutSessionsInput = {
    id?: string
    title: string
    description: string
    category: $Enums.TripCategory
    startLocation: string
    durationDays: number
    durationNights: number
    inclusions?: TripTemplateCreateinclusionsInput | string[]
    exclusions?: TripTemplateCreateexclusionsInput | string[]
    checklist?: TripTemplateCreatechecklistInput | string[]
    images?: TripTemplateCreateimagesInput | string[]
    status?: $Enums.TripStatus
    featured?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    agency: AgencyProfileCreateNestedOneWithoutTemplatesInput
    itinerary?: ItineraryDayCreateNestedManyWithoutTemplateInput
  }

  export type TripTemplateUncheckedCreateWithoutSessionsInput = {
    id?: string
    agencyId: string
    title: string
    description: string
    category: $Enums.TripCategory
    startLocation: string
    durationDays: number
    durationNights: number
    inclusions?: TripTemplateCreateinclusionsInput | string[]
    exclusions?: TripTemplateCreateexclusionsInput | string[]
    checklist?: TripTemplateCreatechecklistInput | string[]
    images?: TripTemplateCreateimagesInput | string[]
    status?: $Enums.TripStatus
    featured?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    itinerary?: ItineraryDayUncheckedCreateNestedManyWithoutTemplateInput
  }

  export type TripTemplateCreateOrConnectWithoutSessionsInput = {
    where: TripTemplateWhereUniqueInput
    create: XOR<TripTemplateCreateWithoutSessionsInput, TripTemplateUncheckedCreateWithoutSessionsInput>
  }

  export type BookingCreateWithoutSessionInput = {
    id?: string
    bookingDate?: Date | string
    status?: $Enums.BookingStatus
    totalAmount: number
    guestsCount: number
    paymentProofId?: string | null
    traveler: UserCreateNestedOneWithoutBookingsInput
    paymentProof?: PaymentProofCreateNestedOneWithoutBookingInput
  }

  export type BookingUncheckedCreateWithoutSessionInput = {
    id?: string
    travelerId: string
    bookingDate?: Date | string
    status?: $Enums.BookingStatus
    totalAmount: number
    guestsCount: number
    paymentProofId?: string | null
    paymentProof?: PaymentProofUncheckedCreateNestedOneWithoutBookingInput
  }

  export type BookingCreateOrConnectWithoutSessionInput = {
    where: BookingWhereUniqueInput
    create: XOR<BookingCreateWithoutSessionInput, BookingUncheckedCreateWithoutSessionInput>
  }

  export type BookingCreateManySessionInputEnvelope = {
    data: BookingCreateManySessionInput | BookingCreateManySessionInput[]
    skipDuplicates?: boolean
  }

  export type TripTemplateUpsertWithoutSessionsInput = {
    update: XOR<TripTemplateUpdateWithoutSessionsInput, TripTemplateUncheckedUpdateWithoutSessionsInput>
    create: XOR<TripTemplateCreateWithoutSessionsInput, TripTemplateUncheckedCreateWithoutSessionsInput>
    where?: TripTemplateWhereInput
  }

  export type TripTemplateUpdateToOneWithWhereWithoutSessionsInput = {
    where?: TripTemplateWhereInput
    data: XOR<TripTemplateUpdateWithoutSessionsInput, TripTemplateUncheckedUpdateWithoutSessionsInput>
  }

  export type TripTemplateUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumTripCategoryFieldUpdateOperationsInput | $Enums.TripCategory
    startLocation?: StringFieldUpdateOperationsInput | string
    durationDays?: IntFieldUpdateOperationsInput | number
    durationNights?: IntFieldUpdateOperationsInput | number
    inclusions?: TripTemplateUpdateinclusionsInput | string[]
    exclusions?: TripTemplateUpdateexclusionsInput | string[]
    checklist?: TripTemplateUpdatechecklistInput | string[]
    images?: TripTemplateUpdateimagesInput | string[]
    status?: EnumTripStatusFieldUpdateOperationsInput | $Enums.TripStatus
    featured?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    agency?: AgencyProfileUpdateOneRequiredWithoutTemplatesNestedInput
    itinerary?: ItineraryDayUpdateManyWithoutTemplateNestedInput
  }

  export type TripTemplateUncheckedUpdateWithoutSessionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    agencyId?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumTripCategoryFieldUpdateOperationsInput | $Enums.TripCategory
    startLocation?: StringFieldUpdateOperationsInput | string
    durationDays?: IntFieldUpdateOperationsInput | number
    durationNights?: IntFieldUpdateOperationsInput | number
    inclusions?: TripTemplateUpdateinclusionsInput | string[]
    exclusions?: TripTemplateUpdateexclusionsInput | string[]
    checklist?: TripTemplateUpdatechecklistInput | string[]
    images?: TripTemplateUpdateimagesInput | string[]
    status?: EnumTripStatusFieldUpdateOperationsInput | $Enums.TripStatus
    featured?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    itinerary?: ItineraryDayUncheckedUpdateManyWithoutTemplateNestedInput
  }

  export type BookingUpsertWithWhereUniqueWithoutSessionInput = {
    where: BookingWhereUniqueInput
    update: XOR<BookingUpdateWithoutSessionInput, BookingUncheckedUpdateWithoutSessionInput>
    create: XOR<BookingCreateWithoutSessionInput, BookingUncheckedCreateWithoutSessionInput>
  }

  export type BookingUpdateWithWhereUniqueWithoutSessionInput = {
    where: BookingWhereUniqueInput
    data: XOR<BookingUpdateWithoutSessionInput, BookingUncheckedUpdateWithoutSessionInput>
  }

  export type BookingUpdateManyWithWhereWithoutSessionInput = {
    where: BookingScalarWhereInput
    data: XOR<BookingUpdateManyMutationInput, BookingUncheckedUpdateManyWithoutSessionInput>
  }

  export type TripSessionCreateWithoutBookingsInput = {
    id?: string
    startDate: Date | string
    endDate: Date | string
    price: number
    deposit?: number
    totalSeats: number
    availableSeats: number
    status?: string
    template: TripTemplateCreateNestedOneWithoutSessionsInput
  }

  export type TripSessionUncheckedCreateWithoutBookingsInput = {
    id?: string
    templateId: string
    startDate: Date | string
    endDate: Date | string
    price: number
    deposit?: number
    totalSeats: number
    availableSeats: number
    status?: string
  }

  export type TripSessionCreateOrConnectWithoutBookingsInput = {
    where: TripSessionWhereUniqueInput
    create: XOR<TripSessionCreateWithoutBookingsInput, TripSessionUncheckedCreateWithoutBookingsInput>
  }

  export type UserCreateWithoutBookingsInput = {
    id?: string
    name?: string | null
    email: string
    password: string
    role?: $Enums.UserRole
    avatar?: string | null
    isEmailVerified?: boolean
    otp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    agencyProfile?: AgencyProfileCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutBookingsInput = {
    id?: string
    name?: string | null
    email: string
    password: string
    role?: $Enums.UserRole
    avatar?: string | null
    isEmailVerified?: boolean
    otp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    agencyProfile?: AgencyProfileUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutBookingsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutBookingsInput, UserUncheckedCreateWithoutBookingsInput>
  }

  export type PaymentProofCreateWithoutBookingInput = {
    id?: string
    imageUrl: string
    uploadedAt?: Date | string
    status?: $Enums.VerificationStatus
  }

  export type PaymentProofUncheckedCreateWithoutBookingInput = {
    id?: string
    imageUrl: string
    uploadedAt?: Date | string
    status?: $Enums.VerificationStatus
  }

  export type PaymentProofCreateOrConnectWithoutBookingInput = {
    where: PaymentProofWhereUniqueInput
    create: XOR<PaymentProofCreateWithoutBookingInput, PaymentProofUncheckedCreateWithoutBookingInput>
  }

  export type TripSessionUpsertWithoutBookingsInput = {
    update: XOR<TripSessionUpdateWithoutBookingsInput, TripSessionUncheckedUpdateWithoutBookingsInput>
    create: XOR<TripSessionCreateWithoutBookingsInput, TripSessionUncheckedCreateWithoutBookingsInput>
    where?: TripSessionWhereInput
  }

  export type TripSessionUpdateToOneWithWhereWithoutBookingsInput = {
    where?: TripSessionWhereInput
    data: XOR<TripSessionUpdateWithoutBookingsInput, TripSessionUncheckedUpdateWithoutBookingsInput>
  }

  export type TripSessionUpdateWithoutBookingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    price?: FloatFieldUpdateOperationsInput | number
    deposit?: FloatFieldUpdateOperationsInput | number
    totalSeats?: IntFieldUpdateOperationsInput | number
    availableSeats?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    template?: TripTemplateUpdateOneRequiredWithoutSessionsNestedInput
  }

  export type TripSessionUncheckedUpdateWithoutBookingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    templateId?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    price?: FloatFieldUpdateOperationsInput | number
    deposit?: FloatFieldUpdateOperationsInput | number
    totalSeats?: IntFieldUpdateOperationsInput | number
    availableSeats?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
  }

  export type UserUpsertWithoutBookingsInput = {
    update: XOR<UserUpdateWithoutBookingsInput, UserUncheckedUpdateWithoutBookingsInput>
    create: XOR<UserCreateWithoutBookingsInput, UserUncheckedCreateWithoutBookingsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutBookingsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutBookingsInput, UserUncheckedUpdateWithoutBookingsInput>
  }

  export type UserUpdateWithoutBookingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    avatar?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    otp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    agencyProfile?: AgencyProfileUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutBookingsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: NullableStringFieldUpdateOperationsInput | string | null
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    avatar?: NullableStringFieldUpdateOperationsInput | string | null
    isEmailVerified?: BoolFieldUpdateOperationsInput | boolean
    otp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    agencyProfile?: AgencyProfileUncheckedUpdateOneWithoutUserNestedInput
  }

  export type PaymentProofUpsertWithoutBookingInput = {
    update: XOR<PaymentProofUpdateWithoutBookingInput, PaymentProofUncheckedUpdateWithoutBookingInput>
    create: XOR<PaymentProofCreateWithoutBookingInput, PaymentProofUncheckedCreateWithoutBookingInput>
    where?: PaymentProofWhereInput
  }

  export type PaymentProofUpdateToOneWithWhereWithoutBookingInput = {
    where?: PaymentProofWhereInput
    data: XOR<PaymentProofUpdateWithoutBookingInput, PaymentProofUncheckedUpdateWithoutBookingInput>
  }

  export type PaymentProofUpdateWithoutBookingInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageUrl?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
  }

  export type PaymentProofUncheckedUpdateWithoutBookingInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageUrl?: StringFieldUpdateOperationsInput | string
    uploadedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
  }

  export type BookingCreateWithoutPaymentProofInput = {
    id?: string
    bookingDate?: Date | string
    status?: $Enums.BookingStatus
    totalAmount: number
    guestsCount: number
    paymentProofId?: string | null
    session: TripSessionCreateNestedOneWithoutBookingsInput
    traveler: UserCreateNestedOneWithoutBookingsInput
  }

  export type BookingUncheckedCreateWithoutPaymentProofInput = {
    id?: string
    sessionId: string
    travelerId: string
    bookingDate?: Date | string
    status?: $Enums.BookingStatus
    totalAmount: number
    guestsCount: number
    paymentProofId?: string | null
  }

  export type BookingCreateOrConnectWithoutPaymentProofInput = {
    where: BookingWhereUniqueInput
    create: XOR<BookingCreateWithoutPaymentProofInput, BookingUncheckedCreateWithoutPaymentProofInput>
  }

  export type BookingUpsertWithoutPaymentProofInput = {
    update: XOR<BookingUpdateWithoutPaymentProofInput, BookingUncheckedUpdateWithoutPaymentProofInput>
    create: XOR<BookingCreateWithoutPaymentProofInput, BookingUncheckedCreateWithoutPaymentProofInput>
    where?: BookingWhereInput
  }

  export type BookingUpdateToOneWithWhereWithoutPaymentProofInput = {
    where?: BookingWhereInput
    data: XOR<BookingUpdateWithoutPaymentProofInput, BookingUncheckedUpdateWithoutPaymentProofInput>
  }

  export type BookingUpdateWithoutPaymentProofInput = {
    id?: StringFieldUpdateOperationsInput | string
    bookingDate?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumBookingStatusFieldUpdateOperationsInput | $Enums.BookingStatus
    totalAmount?: FloatFieldUpdateOperationsInput | number
    guestsCount?: IntFieldUpdateOperationsInput | number
    paymentProofId?: NullableStringFieldUpdateOperationsInput | string | null
    session?: TripSessionUpdateOneRequiredWithoutBookingsNestedInput
    traveler?: UserUpdateOneRequiredWithoutBookingsNestedInput
  }

  export type BookingUncheckedUpdateWithoutPaymentProofInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionId?: StringFieldUpdateOperationsInput | string
    travelerId?: StringFieldUpdateOperationsInput | string
    bookingDate?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumBookingStatusFieldUpdateOperationsInput | $Enums.BookingStatus
    totalAmount?: FloatFieldUpdateOperationsInput | number
    guestsCount?: IntFieldUpdateOperationsInput | number
    paymentProofId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AgencyProfileCreateWithoutWalletInput = {
    id?: string
    companyName: string
    ice: string
    patente: string
    rib: string
    verificationStatus?: $Enums.VerificationStatus
    bio?: string | null
    logo?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    trialEndsAt?: Date | string | null
    subscriptionEndsAt?: Date | string | null
    user: UserCreateNestedOneWithoutAgencyProfileInput
    templates?: TripTemplateCreateNestedManyWithoutAgencyInput
    payoutRequests?: PayoutRequestCreateNestedManyWithoutAgencyInput
  }

  export type AgencyProfileUncheckedCreateWithoutWalletInput = {
    id?: string
    userId: string
    companyName: string
    ice: string
    patente: string
    rib: string
    verificationStatus?: $Enums.VerificationStatus
    bio?: string | null
    logo?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    trialEndsAt?: Date | string | null
    subscriptionEndsAt?: Date | string | null
    templates?: TripTemplateUncheckedCreateNestedManyWithoutAgencyInput
    payoutRequests?: PayoutRequestUncheckedCreateNestedManyWithoutAgencyInput
  }

  export type AgencyProfileCreateOrConnectWithoutWalletInput = {
    where: AgencyProfileWhereUniqueInput
    create: XOR<AgencyProfileCreateWithoutWalletInput, AgencyProfileUncheckedCreateWithoutWalletInput>
  }

  export type WalletTransactionCreateWithoutWalletInput = {
    id?: string
    amount: number
    type: $Enums.TransactionType
    reason: string
    createdAt?: Date | string
  }

  export type WalletTransactionUncheckedCreateWithoutWalletInput = {
    id?: string
    amount: number
    type: $Enums.TransactionType
    reason: string
    createdAt?: Date | string
  }

  export type WalletTransactionCreateOrConnectWithoutWalletInput = {
    where: WalletTransactionWhereUniqueInput
    create: XOR<WalletTransactionCreateWithoutWalletInput, WalletTransactionUncheckedCreateWithoutWalletInput>
  }

  export type WalletTransactionCreateManyWalletInputEnvelope = {
    data: WalletTransactionCreateManyWalletInput | WalletTransactionCreateManyWalletInput[]
    skipDuplicates?: boolean
  }

  export type AgencyProfileUpsertWithoutWalletInput = {
    update: XOR<AgencyProfileUpdateWithoutWalletInput, AgencyProfileUncheckedUpdateWithoutWalletInput>
    create: XOR<AgencyProfileCreateWithoutWalletInput, AgencyProfileUncheckedCreateWithoutWalletInput>
    where?: AgencyProfileWhereInput
  }

  export type AgencyProfileUpdateToOneWithWhereWithoutWalletInput = {
    where?: AgencyProfileWhereInput
    data: XOR<AgencyProfileUpdateWithoutWalletInput, AgencyProfileUncheckedUpdateWithoutWalletInput>
  }

  export type AgencyProfileUpdateWithoutWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    ice?: StringFieldUpdateOperationsInput | string
    patente?: StringFieldUpdateOperationsInput | string
    rib?: StringFieldUpdateOperationsInput | string
    verificationStatus?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    logo?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subscriptionEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneRequiredWithoutAgencyProfileNestedInput
    templates?: TripTemplateUpdateManyWithoutAgencyNestedInput
    payoutRequests?: PayoutRequestUpdateManyWithoutAgencyNestedInput
  }

  export type AgencyProfileUncheckedUpdateWithoutWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    ice?: StringFieldUpdateOperationsInput | string
    patente?: StringFieldUpdateOperationsInput | string
    rib?: StringFieldUpdateOperationsInput | string
    verificationStatus?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    logo?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subscriptionEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    templates?: TripTemplateUncheckedUpdateManyWithoutAgencyNestedInput
    payoutRequests?: PayoutRequestUncheckedUpdateManyWithoutAgencyNestedInput
  }

  export type WalletTransactionUpsertWithWhereUniqueWithoutWalletInput = {
    where: WalletTransactionWhereUniqueInput
    update: XOR<WalletTransactionUpdateWithoutWalletInput, WalletTransactionUncheckedUpdateWithoutWalletInput>
    create: XOR<WalletTransactionCreateWithoutWalletInput, WalletTransactionUncheckedCreateWithoutWalletInput>
  }

  export type WalletTransactionUpdateWithWhereUniqueWithoutWalletInput = {
    where: WalletTransactionWhereUniqueInput
    data: XOR<WalletTransactionUpdateWithoutWalletInput, WalletTransactionUncheckedUpdateWithoutWalletInput>
  }

  export type WalletTransactionUpdateManyWithWhereWithoutWalletInput = {
    where: WalletTransactionScalarWhereInput
    data: XOR<WalletTransactionUpdateManyMutationInput, WalletTransactionUncheckedUpdateManyWithoutWalletInput>
  }

  export type WalletTransactionScalarWhereInput = {
    AND?: WalletTransactionScalarWhereInput | WalletTransactionScalarWhereInput[]
    OR?: WalletTransactionScalarWhereInput[]
    NOT?: WalletTransactionScalarWhereInput | WalletTransactionScalarWhereInput[]
    id?: StringFilter<"WalletTransaction"> | string
    walletId?: StringFilter<"WalletTransaction"> | string
    amount?: FloatFilter<"WalletTransaction"> | number
    type?: EnumTransactionTypeFilter<"WalletTransaction"> | $Enums.TransactionType
    reason?: StringFilter<"WalletTransaction"> | string
    createdAt?: DateTimeFilter<"WalletTransaction"> | Date | string
  }

  export type WalletCreateWithoutTransactionsInput = {
    id?: string
    availableBalance?: number
    pendingBalance?: number
    agency: AgencyProfileCreateNestedOneWithoutWalletInput
  }

  export type WalletUncheckedCreateWithoutTransactionsInput = {
    id?: string
    agencyId: string
    availableBalance?: number
    pendingBalance?: number
  }

  export type WalletCreateOrConnectWithoutTransactionsInput = {
    where: WalletWhereUniqueInput
    create: XOR<WalletCreateWithoutTransactionsInput, WalletUncheckedCreateWithoutTransactionsInput>
  }

  export type WalletUpsertWithoutTransactionsInput = {
    update: XOR<WalletUpdateWithoutTransactionsInput, WalletUncheckedUpdateWithoutTransactionsInput>
    create: XOR<WalletCreateWithoutTransactionsInput, WalletUncheckedCreateWithoutTransactionsInput>
    where?: WalletWhereInput
  }

  export type WalletUpdateToOneWithWhereWithoutTransactionsInput = {
    where?: WalletWhereInput
    data: XOR<WalletUpdateWithoutTransactionsInput, WalletUncheckedUpdateWithoutTransactionsInput>
  }

  export type WalletUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    availableBalance?: FloatFieldUpdateOperationsInput | number
    pendingBalance?: FloatFieldUpdateOperationsInput | number
    agency?: AgencyProfileUpdateOneRequiredWithoutWalletNestedInput
  }

  export type WalletUncheckedUpdateWithoutTransactionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    agencyId?: StringFieldUpdateOperationsInput | string
    availableBalance?: FloatFieldUpdateOperationsInput | number
    pendingBalance?: FloatFieldUpdateOperationsInput | number
  }

  export type AgencyProfileCreateWithoutPayoutRequestsInput = {
    id?: string
    companyName: string
    ice: string
    patente: string
    rib: string
    verificationStatus?: $Enums.VerificationStatus
    bio?: string | null
    logo?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    trialEndsAt?: Date | string | null
    subscriptionEndsAt?: Date | string | null
    user: UserCreateNestedOneWithoutAgencyProfileInput
    templates?: TripTemplateCreateNestedManyWithoutAgencyInput
    wallet?: WalletCreateNestedOneWithoutAgencyInput
  }

  export type AgencyProfileUncheckedCreateWithoutPayoutRequestsInput = {
    id?: string
    userId: string
    companyName: string
    ice: string
    patente: string
    rib: string
    verificationStatus?: $Enums.VerificationStatus
    bio?: string | null
    logo?: string | null
    subscriptionStatus?: $Enums.SubscriptionStatus
    trialEndsAt?: Date | string | null
    subscriptionEndsAt?: Date | string | null
    templates?: TripTemplateUncheckedCreateNestedManyWithoutAgencyInput
    wallet?: WalletUncheckedCreateNestedOneWithoutAgencyInput
  }

  export type AgencyProfileCreateOrConnectWithoutPayoutRequestsInput = {
    where: AgencyProfileWhereUniqueInput
    create: XOR<AgencyProfileCreateWithoutPayoutRequestsInput, AgencyProfileUncheckedCreateWithoutPayoutRequestsInput>
  }

  export type AgencyProfileUpsertWithoutPayoutRequestsInput = {
    update: XOR<AgencyProfileUpdateWithoutPayoutRequestsInput, AgencyProfileUncheckedUpdateWithoutPayoutRequestsInput>
    create: XOR<AgencyProfileCreateWithoutPayoutRequestsInput, AgencyProfileUncheckedCreateWithoutPayoutRequestsInput>
    where?: AgencyProfileWhereInput
  }

  export type AgencyProfileUpdateToOneWithWhereWithoutPayoutRequestsInput = {
    where?: AgencyProfileWhereInput
    data: XOR<AgencyProfileUpdateWithoutPayoutRequestsInput, AgencyProfileUncheckedUpdateWithoutPayoutRequestsInput>
  }

  export type AgencyProfileUpdateWithoutPayoutRequestsInput = {
    id?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    ice?: StringFieldUpdateOperationsInput | string
    patente?: StringFieldUpdateOperationsInput | string
    rib?: StringFieldUpdateOperationsInput | string
    verificationStatus?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    logo?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subscriptionEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneRequiredWithoutAgencyProfileNestedInput
    templates?: TripTemplateUpdateManyWithoutAgencyNestedInput
    wallet?: WalletUpdateOneWithoutAgencyNestedInput
  }

  export type AgencyProfileUncheckedUpdateWithoutPayoutRequestsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    companyName?: StringFieldUpdateOperationsInput | string
    ice?: StringFieldUpdateOperationsInput | string
    patente?: StringFieldUpdateOperationsInput | string
    rib?: StringFieldUpdateOperationsInput | string
    verificationStatus?: EnumVerificationStatusFieldUpdateOperationsInput | $Enums.VerificationStatus
    bio?: NullableStringFieldUpdateOperationsInput | string | null
    logo?: NullableStringFieldUpdateOperationsInput | string | null
    subscriptionStatus?: EnumSubscriptionStatusFieldUpdateOperationsInput | $Enums.SubscriptionStatus
    trialEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    subscriptionEndsAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    templates?: TripTemplateUncheckedUpdateManyWithoutAgencyNestedInput
    wallet?: WalletUncheckedUpdateOneWithoutAgencyNestedInput
  }

  export type BookingCreateManyTravelerInput = {
    id?: string
    sessionId: string
    bookingDate?: Date | string
    status?: $Enums.BookingStatus
    totalAmount: number
    guestsCount: number
    paymentProofId?: string | null
  }

  export type BookingUpdateWithoutTravelerInput = {
    id?: StringFieldUpdateOperationsInput | string
    bookingDate?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumBookingStatusFieldUpdateOperationsInput | $Enums.BookingStatus
    totalAmount?: FloatFieldUpdateOperationsInput | number
    guestsCount?: IntFieldUpdateOperationsInput | number
    paymentProofId?: NullableStringFieldUpdateOperationsInput | string | null
    session?: TripSessionUpdateOneRequiredWithoutBookingsNestedInput
    paymentProof?: PaymentProofUpdateOneWithoutBookingNestedInput
  }

  export type BookingUncheckedUpdateWithoutTravelerInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionId?: StringFieldUpdateOperationsInput | string
    bookingDate?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumBookingStatusFieldUpdateOperationsInput | $Enums.BookingStatus
    totalAmount?: FloatFieldUpdateOperationsInput | number
    guestsCount?: IntFieldUpdateOperationsInput | number
    paymentProofId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentProof?: PaymentProofUncheckedUpdateOneWithoutBookingNestedInput
  }

  export type BookingUncheckedUpdateManyWithoutTravelerInput = {
    id?: StringFieldUpdateOperationsInput | string
    sessionId?: StringFieldUpdateOperationsInput | string
    bookingDate?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumBookingStatusFieldUpdateOperationsInput | $Enums.BookingStatus
    totalAmount?: FloatFieldUpdateOperationsInput | number
    guestsCount?: IntFieldUpdateOperationsInput | number
    paymentProofId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type TripTemplateCreateManyAgencyInput = {
    id?: string
    title: string
    description: string
    category: $Enums.TripCategory
    startLocation: string
    durationDays: number
    durationNights: number
    inclusions?: TripTemplateCreateinclusionsInput | string[]
    exclusions?: TripTemplateCreateexclusionsInput | string[]
    checklist?: TripTemplateCreatechecklistInput | string[]
    images?: TripTemplateCreateimagesInput | string[]
    status?: $Enums.TripStatus
    featured?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type PayoutRequestCreateManyAgencyInput = {
    id?: string
    amount: number
    status?: $Enums.PayoutStatus
    requestedAt?: Date | string
    processedAt?: Date | string | null
    bankDetails: string
  }

  export type TripTemplateUpdateWithoutAgencyInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumTripCategoryFieldUpdateOperationsInput | $Enums.TripCategory
    startLocation?: StringFieldUpdateOperationsInput | string
    durationDays?: IntFieldUpdateOperationsInput | number
    durationNights?: IntFieldUpdateOperationsInput | number
    inclusions?: TripTemplateUpdateinclusionsInput | string[]
    exclusions?: TripTemplateUpdateexclusionsInput | string[]
    checklist?: TripTemplateUpdatechecklistInput | string[]
    images?: TripTemplateUpdateimagesInput | string[]
    status?: EnumTripStatusFieldUpdateOperationsInput | $Enums.TripStatus
    featured?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: TripSessionUpdateManyWithoutTemplateNestedInput
    itinerary?: ItineraryDayUpdateManyWithoutTemplateNestedInput
  }

  export type TripTemplateUncheckedUpdateWithoutAgencyInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumTripCategoryFieldUpdateOperationsInput | $Enums.TripCategory
    startLocation?: StringFieldUpdateOperationsInput | string
    durationDays?: IntFieldUpdateOperationsInput | number
    durationNights?: IntFieldUpdateOperationsInput | number
    inclusions?: TripTemplateUpdateinclusionsInput | string[]
    exclusions?: TripTemplateUpdateexclusionsInput | string[]
    checklist?: TripTemplateUpdatechecklistInput | string[]
    images?: TripTemplateUpdateimagesInput | string[]
    status?: EnumTripStatusFieldUpdateOperationsInput | $Enums.TripStatus
    featured?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sessions?: TripSessionUncheckedUpdateManyWithoutTemplateNestedInput
    itinerary?: ItineraryDayUncheckedUpdateManyWithoutTemplateNestedInput
  }

  export type TripTemplateUncheckedUpdateManyWithoutAgencyInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    category?: EnumTripCategoryFieldUpdateOperationsInput | $Enums.TripCategory
    startLocation?: StringFieldUpdateOperationsInput | string
    durationDays?: IntFieldUpdateOperationsInput | number
    durationNights?: IntFieldUpdateOperationsInput | number
    inclusions?: TripTemplateUpdateinclusionsInput | string[]
    exclusions?: TripTemplateUpdateexclusionsInput | string[]
    checklist?: TripTemplateUpdatechecklistInput | string[]
    images?: TripTemplateUpdateimagesInput | string[]
    status?: EnumTripStatusFieldUpdateOperationsInput | $Enums.TripStatus
    featured?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PayoutRequestUpdateWithoutAgencyInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    status?: EnumPayoutStatusFieldUpdateOperationsInput | $Enums.PayoutStatus
    requestedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bankDetails?: StringFieldUpdateOperationsInput | string
  }

  export type PayoutRequestUncheckedUpdateWithoutAgencyInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    status?: EnumPayoutStatusFieldUpdateOperationsInput | $Enums.PayoutStatus
    requestedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bankDetails?: StringFieldUpdateOperationsInput | string
  }

  export type PayoutRequestUncheckedUpdateManyWithoutAgencyInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    status?: EnumPayoutStatusFieldUpdateOperationsInput | $Enums.PayoutStatus
    requestedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    bankDetails?: StringFieldUpdateOperationsInput | string
  }

  export type TripSessionCreateManyTemplateInput = {
    id?: string
    startDate: Date | string
    endDate: Date | string
    price: number
    deposit?: number
    totalSeats: number
    availableSeats: number
    status?: string
  }

  export type ItineraryDayCreateManyTemplateInput = {
    id?: string
    dayNumber: number
    title?: string | null
    description: string
    activities?: ItineraryDayCreateactivitiesInput | string[]
  }

  export type TripSessionUpdateWithoutTemplateInput = {
    id?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    price?: FloatFieldUpdateOperationsInput | number
    deposit?: FloatFieldUpdateOperationsInput | number
    totalSeats?: IntFieldUpdateOperationsInput | number
    availableSeats?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    bookings?: BookingUpdateManyWithoutSessionNestedInput
  }

  export type TripSessionUncheckedUpdateWithoutTemplateInput = {
    id?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    price?: FloatFieldUpdateOperationsInput | number
    deposit?: FloatFieldUpdateOperationsInput | number
    totalSeats?: IntFieldUpdateOperationsInput | number
    availableSeats?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
    bookings?: BookingUncheckedUpdateManyWithoutSessionNestedInput
  }

  export type TripSessionUncheckedUpdateManyWithoutTemplateInput = {
    id?: StringFieldUpdateOperationsInput | string
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    endDate?: DateTimeFieldUpdateOperationsInput | Date | string
    price?: FloatFieldUpdateOperationsInput | number
    deposit?: FloatFieldUpdateOperationsInput | number
    totalSeats?: IntFieldUpdateOperationsInput | number
    availableSeats?: IntFieldUpdateOperationsInput | number
    status?: StringFieldUpdateOperationsInput | string
  }

  export type ItineraryDayUpdateWithoutTemplateInput = {
    id?: StringFieldUpdateOperationsInput | string
    dayNumber?: IntFieldUpdateOperationsInput | number
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: StringFieldUpdateOperationsInput | string
    activities?: ItineraryDayUpdateactivitiesInput | string[]
  }

  export type ItineraryDayUncheckedUpdateWithoutTemplateInput = {
    id?: StringFieldUpdateOperationsInput | string
    dayNumber?: IntFieldUpdateOperationsInput | number
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: StringFieldUpdateOperationsInput | string
    activities?: ItineraryDayUpdateactivitiesInput | string[]
  }

  export type ItineraryDayUncheckedUpdateManyWithoutTemplateInput = {
    id?: StringFieldUpdateOperationsInput | string
    dayNumber?: IntFieldUpdateOperationsInput | number
    title?: NullableStringFieldUpdateOperationsInput | string | null
    description?: StringFieldUpdateOperationsInput | string
    activities?: ItineraryDayUpdateactivitiesInput | string[]
  }

  export type BookingCreateManySessionInput = {
    id?: string
    travelerId: string
    bookingDate?: Date | string
    status?: $Enums.BookingStatus
    totalAmount: number
    guestsCount: number
    paymentProofId?: string | null
  }

  export type BookingUpdateWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    bookingDate?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumBookingStatusFieldUpdateOperationsInput | $Enums.BookingStatus
    totalAmount?: FloatFieldUpdateOperationsInput | number
    guestsCount?: IntFieldUpdateOperationsInput | number
    paymentProofId?: NullableStringFieldUpdateOperationsInput | string | null
    traveler?: UserUpdateOneRequiredWithoutBookingsNestedInput
    paymentProof?: PaymentProofUpdateOneWithoutBookingNestedInput
  }

  export type BookingUncheckedUpdateWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    travelerId?: StringFieldUpdateOperationsInput | string
    bookingDate?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumBookingStatusFieldUpdateOperationsInput | $Enums.BookingStatus
    totalAmount?: FloatFieldUpdateOperationsInput | number
    guestsCount?: IntFieldUpdateOperationsInput | number
    paymentProofId?: NullableStringFieldUpdateOperationsInput | string | null
    paymentProof?: PaymentProofUncheckedUpdateOneWithoutBookingNestedInput
  }

  export type BookingUncheckedUpdateManyWithoutSessionInput = {
    id?: StringFieldUpdateOperationsInput | string
    travelerId?: StringFieldUpdateOperationsInput | string
    bookingDate?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumBookingStatusFieldUpdateOperationsInput | $Enums.BookingStatus
    totalAmount?: FloatFieldUpdateOperationsInput | number
    guestsCount?: IntFieldUpdateOperationsInput | number
    paymentProofId?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type WalletTransactionCreateManyWalletInput = {
    id?: string
    amount: number
    type: $Enums.TransactionType
    reason: string
    createdAt?: Date | string
  }

  export type WalletTransactionUpdateWithoutWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WalletTransactionUncheckedUpdateWithoutWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type WalletTransactionUncheckedUpdateManyWithoutWalletInput = {
    id?: StringFieldUpdateOperationsInput | string
    amount?: FloatFieldUpdateOperationsInput | number
    type?: EnumTransactionTypeFieldUpdateOperationsInput | $Enums.TransactionType
    reason?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use UserCountOutputTypeDefaultArgs instead
     */
    export type UserCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AgencyProfileCountOutputTypeDefaultArgs instead
     */
    export type AgencyProfileCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AgencyProfileCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use TripTemplateCountOutputTypeDefaultArgs instead
     */
    export type TripTemplateCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = TripTemplateCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use TripSessionCountOutputTypeDefaultArgs instead
     */
    export type TripSessionCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = TripSessionCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use WalletCountOutputTypeDefaultArgs instead
     */
    export type WalletCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = WalletCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UserDefaultArgs instead
     */
    export type UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AgencyProfileDefaultArgs instead
     */
    export type AgencyProfileArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AgencyProfileDefaultArgs<ExtArgs>
    /**
     * @deprecated Use TripTemplateDefaultArgs instead
     */
    export type TripTemplateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = TripTemplateDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ItineraryDayDefaultArgs instead
     */
    export type ItineraryDayArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ItineraryDayDefaultArgs<ExtArgs>
    /**
     * @deprecated Use TripSessionDefaultArgs instead
     */
    export type TripSessionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = TripSessionDefaultArgs<ExtArgs>
    /**
     * @deprecated Use BookingDefaultArgs instead
     */
    export type BookingArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = BookingDefaultArgs<ExtArgs>
    /**
     * @deprecated Use PaymentProofDefaultArgs instead
     */
    export type PaymentProofArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = PaymentProofDefaultArgs<ExtArgs>
    /**
     * @deprecated Use WalletDefaultArgs instead
     */
    export type WalletArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = WalletDefaultArgs<ExtArgs>
    /**
     * @deprecated Use WalletTransactionDefaultArgs instead
     */
    export type WalletTransactionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = WalletTransactionDefaultArgs<ExtArgs>
    /**
     * @deprecated Use PayoutRequestDefaultArgs instead
     */
    export type PayoutRequestArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = PayoutRequestDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}