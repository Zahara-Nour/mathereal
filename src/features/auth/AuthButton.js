import React from 'react'
import Button from 'react-bulma-components/lib/components/button'
import { GoogleLogin, GoogleLogout } from 'react-google-login'
import { useDispatch, useSelector } from 'react-redux'
import {
  loginRequest,
  loginSuccess,
  loginFailure,
  logoutRequest,
  logoutSuccess,
} from './authSlice'
import { selectConnected } from './authSlice'

export default function AuthButton() {
  const dispatch = useDispatch()
  const connected = useSelector(selectConnected)

  const handleLoginSuccess = (response) => {
    console.log(response.profileObj)
    dispatch(loginSuccess({ user: response.profileObj }))
  }

  const handleLoginFailure = (response) => {
    console.log(response)
    dispatch(loginFailure({ error: response.error }))
  }

  const handleLogoutSuccess = (response) => {
    console.log(response)
    dispatch(logoutSuccess())
  }

  if (connected)
    return (
      <GoogleLogout
        clientId="702572178697-3pdjj0caro5u0ttpft17ppc0fnlmol1p.apps.googleusercontent.com"
        render={(renderProps) => (
          <Button
            color="primary"
            onClick={() => {
              dispatch(logoutRequest())
              renderProps.onClick()
            }}
            disabled={renderProps.disabled}
          >
            Logout
          </Button>
        )}
        onLogoutSuccess={handleLogoutSuccess}
        cookiePolicy={'single_host_origin'}
      />
    )
  else
    return (
      <GoogleLogin
        clientId="702572178697-3pdjj0caro5u0ttpft17ppc0fnlmol1p.apps.googleusercontent.com"
        render={(renderProps) => (
          <Button
            color="danger"
            onClick={() => {
              dispatch(loginRequest())
              renderProps.onClick()
            }}
            disabled={renderProps.disabled}
          >
            Login
          </Button>
        )}
        onSuccess={handleLoginSuccess}
        onFailure={handleLoginFailure}
        cookiePolicy={'single_host_origin'}
      />
    )
}