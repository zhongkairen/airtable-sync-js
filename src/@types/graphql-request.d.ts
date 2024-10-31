declare module 'graphql-request' {
    export class GraphQLClient {
        constructor(endpoint: string, options?: any);
        request<T = any>(query: string, variables?: any): Promise<T>;
    }
}