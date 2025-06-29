// src/utils/Router.js
import React, { useState } from 'react';

export const Router = ({ children }) => {
  const [currentPath, setCurrentPath] = useState('/');
  
  const navigate = (path) => {
    setCurrentPath(path);
  };

  return (
    <div>
      {React.cloneElement(children, { currentPath, navigate })}
    </div>
  );
};