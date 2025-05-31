import { LocalStorage } from 'quasar'
import { Notify } from 'quasar'

export const authStateChange = (credentials) => {
  if (credentials) {
    LocalStorage.setItem('credentials', credentials)
  } else {
    LocalStorage.removeItem('credentials')
  }
}

export const hasAccessToken = () => {
  return LocalStorage.hasItem('credentials')
}

export const getAccessToken = () => {
  return LocalStorage.getItem('credentials')?.access_token
}

export const logout = () => {
  authStateChange(null)
  Notify.create({
    type: 'info',
    message: 'Logout successful',
  })
}
export const login = (userdata) => {
  return new Promise((resolve, reject) => {
    const getFormData = (object) =>
      Object.keys(object).reduce((formData, key) => {
        formData.append(key, object[key])
        return formData
      }, new FormData())

    fetch('/api/admin/auth/token', {
      method: 'POST',
      body: getFormData(userdata),
    })
      .then((response) => {
        if (response.ok) {
          return response.json()
        } else {
          authStateChange(null)
          throw new Error('Failed to authenticate')
        }
      })
      .then((response_json_credentials) => {
        authStateChange(response_json_credentials)
        resolve(response_json_credentials)
      })
      .catch((err) => {
        authStateChange(null)
        Notify.create({
          type: 'negative',
          message: err.message,
        })
        reject(err.message)
      })
  })
}
