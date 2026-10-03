import { useEffect } from "react";
import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import { AppProvider } from "./lib/app";
import { Header, MobileNav, ProfileDialog, SignInDialog, Toast } from "./components/Chrome";
import { Home } from "./pages/Home";
import { Match } from "./pages/Match";
import { MyTrips } from "./pages/MyTrips";
import { PostRide } from "./pages/PostRide";
import { ProfilePage } from "./pages/ProfilePage";
import { RideDetail } from "./pages/RideDetail";
import { Empty } from "./components/Bits";

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AppProvider>
      {/* HashRouter keeps deep links working on GitHub Pages without server rewrites. */}
      <HashRouter>
        <ScrollTop />
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/match" element={<Match />} />
            <Route path="/post" element={<PostRide />} />
            <Route path="/ride/:id" element={<RideDetail />} />
            <Route path="/trips" element={<MyTrips />} />
            <Route path="/u/:id" element={<ProfilePage />} />
            <Route path="*" element={<div className="wrap page"><Empty title="Page not found" /></div>} />
          </Routes>
        </main>
        <footer className="site-footer"><div className="wrap"><span>Wayfellow is a student ride board. Riders and drivers arrange trips between themselves; share costs, not profit.</span><span>Meet somewhere public and tell a friend your route.</span></div></footer>
        <MobileNav />
        <SignInDialog />
        <ProfileDialog />
        <Toast />
      </HashRouter>
    </AppProvider>
  );
}
