import { IFunction } from "../core/IFunctionCall";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { FunctionContract } from '../core/FunctionContract';

/**
 * API Tool for making REST and GraphQL API calls
 * Provides a wrapper for HTTP requests with built-in error handling
 */
export class APITool {
  private axiosInstance: AxiosInstance;
  private baseURL?: string;
  private headers: Record<string, string>;

  constructor(options?: {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
  }) {
    this.baseURL = options?.baseURL;
    this.headers = options?.headers || {};
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: options?.timeout || 30000,
      headers: this.headers
    });
  }

  /**
   * Make a GET request
   */
  async get(url: string, config?: AxiosRequestConfig): Promise<any> {
    try {
      const response: AxiosResponse = await this.axiosInstance.get(url, config);
      return response.data;
    } catch (error: any) {
      throw new Error(`GET request failed: ${error.message}`);
    }
  }

  /**
   * Make a POST request
   */
  async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<any> {
    try {
      const response: AxiosResponse = await this.axiosInstance.post(url, data, config);
      return response.data;
    } catch (error: any) {
      throw new Error(`POST request failed: ${error.message}`);
    }
  }

  /**
   * Make a PUT request
   */
  async put(url: string, data?: any, config?: AxiosRequestConfig): Promise<any> {
    try {
      const response: AxiosResponse = await this.axiosInstance.put(url, data, config);
      return response.data;
    } catch (error: any) {
      throw new Error(`PUT request failed: ${error.message}`);
    }
  }

  /**
   * Make a PATCH request
   */
  async patch(url: string, data?: any, config?: AxiosRequestConfig): Promise<any> {
    try {
      const response: AxiosResponse = await this.axiosInstance.patch(url, data, config);
      return response.data;
    } catch (error: any) {
      throw new Error(`PATCH request failed: ${error.message}`);
    }
  }

  /**
   * Make a DELETE request
   */
  async delete(url: string, config?: AxiosRequestConfig): Promise<any> {
    try {
      const response: AxiosResponse = await this.axiosInstance.delete(url, config);
      return response.data;
    } catch (error: any) {
      throw new Error(`DELETE request failed: ${error.message}`);
    }
  }

  /**
   * Make a GraphQL query
   */
  async graphql(query: string, variables?: any): Promise<any> {
    try {
      const response = await this.post('', {
        query,
        variables
      });
      
      if (response.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(response.errors)}`);
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(`GraphQL request failed: ${error.message}`);
    }
  }

  /**
   * Set authorization header
   */
  setAuthToken(token: string, type: 'Bearer' | 'Basic' = 'Bearer'): void {
    this.headers['Authorization'] = `${type} ${token}`;
    this.axiosInstance.defaults.headers.common['Authorization'] = `${type} ${token}`;
  }

  /**
   * Set custom header
   */
  setHeader(key: string, value: string): void {
    this.headers[key] = value;
    this.axiosInstance.defaults.headers.common[key] = value;
  }

  /**
   * Create function contracts for use with agents
   */
  static createFunctionContracts(tool: APITool): IFunction[] {
    return [
      FunctionContract.fromFunction(
        'api_get',
        'Make a GET request to an API endpoint',
        [
          {
            name: 'url',
            type: 'string',
            description: 'URL or path to GET (relative to base URL if set)',
            required: true
          },
          {
            name: 'headers',
            type: 'object',
            description: 'Optional headers for the request',
            required: false
          }
        ],
        async (url: string, headers?: Record<string, string>) => {
          const data = await tool.get(url, { headers });
          return JSON.stringify(data, null, 2);
        }
      ),
      FunctionContract.fromFunction(
        'api_post',
        'Make a POST request to an API endpoint',
        [
          {
            name: 'url',
            type: 'string',
            description: 'URL or path to POST (relative to base URL if set)',
            required: true
          },
          {
            name: 'data',
            type: 'object',
            description: 'Data to send in the POST request',
            required: true
          },
          {
            name: 'headers',
            type: 'object',
            description: 'Optional headers for the request',
            required: false
          }
        ],
        async (url: string, data: any, headers?: Record<string, string>) => {
          const response = await tool.post(url, data, { headers });
          return JSON.stringify(response, null, 2);
        }
      ),
      FunctionContract.fromFunction(
        'api_graphql',
        'Make a GraphQL query',
        [
          {
            name: 'query',
            type: 'string',
            description: 'GraphQL query string',
            required: true
          },
          {
            name: 'variables',
            type: 'object',
            description: 'Optional variables for the query',
            required: false
          }
        ],
        async (query: string, variables?: any) => {
          const data = await tool.graphql(query, variables);
          return JSON.stringify(data, null, 2);
        }
      )
    ];
  }
}
