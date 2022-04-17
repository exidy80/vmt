import React from 'react';
import AUTH from 'utils/auth';
import { getGoogleUrl } from 'utils';
import buttonImg from './images/btn_google_signin_dark_normal_web.png';
import classes from './loginButton.css';

const loginButton = () => {
  return (
    // <a href="http://localhost:3000/auth/google?redirectURL=http://localhost:3000/oauth/return">
    <div
      className={classes.Button}
      role="button"
      onClick={() =>
        AUTH.google(getGoogleUrl()).then((doc) => document.write(doc.data))
      }
      onKeyDown={() => AUTH.google(getGoogleUrl())}
      tabIndex="-1"
    >
      <img src={buttonImg} alt="signin with google" />
    </div>
    // </a>
  );
};

export default loginButton;
