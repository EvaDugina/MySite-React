import React from "react";
import { Link } from "react-router-dom";
import "./Neprikosnovenna.css";

function Neprikosnovenna() {
  return (
    <>
      <ul>
        <li>
          <Link to="when-you-so-beautifully-died">
            когда ты так красиво умирала
          </Link>
        </li>
      </ul>
    </>
  );
}

export default Neprikosnovenna;
