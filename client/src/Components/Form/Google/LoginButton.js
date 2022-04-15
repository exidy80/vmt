import React from 'react';
import AUTH from 'utils/auth';
import buttonImg from './images/btn_google_signin_dark_normal_web.png';
// import { getGoogleUrl } from '../../../utils/appUrls';

const loginButton = () => {
  return (
    // <a href={getGoogleUrl()}>
    <div
      role="button"
      onClick={() => AUTH.google()}
      onKeyDown={() => AUTH.google()}
      tabIndex="-1"
    >
      <img src={buttonImg} alt="signin with google" />
    </div>
    // </a>
  );
};

export default loginButton;
