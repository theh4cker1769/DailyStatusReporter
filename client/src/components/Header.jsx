import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";


function Header() {
    const [currentTime, setCurrentTime] = useState("");

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();

            const date = now.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
            });

            const time = now.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
            });

            setCurrentTime(`${date} • ${time}`);
        };

        updateClock();

        const timer = setInterval(updateClock, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <header className="header">
            <div className="header-left">
                <h1>📋 Daily Status Reporter</h1>
                <p>Generate and send your daily work report</p>
            </div>

            <div className="header-nav">
                <NavLink className="header-link" to="/">
                    Dashboard
                </NavLink>
                <NavLink className="header-link" to="/history">
                    History
                </NavLink>
            </div>

            <div className="header-right">
                <span className="status-badge">🟢 Ready</span>
                <p>{currentTime}</p>
            </div>
        </header>
    );
}

export default Header;