/**
 * API service for HTTP requests
 */
import { API_CONFIG } from '../constants/config'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

class ApiService {
  private baseUrl = API_CONFIG.BASE_URL

  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (response.ok) {
        return { success: true, data }
      } else {
        return { success: false, error: data.message || 'Request failed' }
      }
    } catch (error) {
      console.error('API GET Error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  async post<T = any>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      
      if (response.ok) {
        return { success: true, data }
      } else {
        return { success: false, error: data.message || 'Request failed' }
      }
    } catch (error) {
      console.error('API POST Error:', error)
      return { success: false, error: 'Network error' }
    }
  }

  // Health check method
  async checkHealth(): Promise<ApiResponse> {
    return this.get('/')
  }

  // API status check
  async getStatus(): Promise<ApiResponse> {
    return this.get('/api/status')
  }
}

export const apiService = new ApiService()
export default apiService
