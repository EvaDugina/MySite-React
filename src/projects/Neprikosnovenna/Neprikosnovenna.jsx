import React from "react";
import { Link } from "react-router-dom";
import "./Neprikosnovenna.css";

function Neprikosnovenna() {
  return (
    <main>
      <nav>
        <ul>
          <li>
            <Link to="when-you-so-beautifully-died">
              когда ты так красиво умирала
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}

export default Neprikosnovenna;
