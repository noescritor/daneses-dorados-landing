import NavBar from "./components/NavBar";
import HeroSection from "./components/HeroSection";
import NextGameBar from "./components/NextGameBar";
import ConceptSection from "./components/ConceptSection";
import RosterSection from "./components/RosterSection";
import StaffSection from "./components/StaffSection";
import CalendarSection from "./components/CalendarSection";
import TicketsSection from "./components/TicketsSection";
import SponsorsSection from "./components/SponsorsSection";
import GallerySection from "./components/GallerySection";
import FooterSection from "./components/FooterSection";
import OrderPage from "./pages/OrderPage";
import TicketPage from "./pages/TicketPage";
import ScanPage from "./pages/ScanPage";

function Landing() {
  return (
    <div className="relative bg-[#07030B]">
      <NavBar />
      <HeroSection />
      <NextGameBar />
      <ConceptSection />
      <RosterSection />
      <StaffSection />
      <CalendarSection />
      <TicketsSection />
      <SponsorsSection />
      <GallerySection />
      <FooterSection />
    </div>
  );
}

export default function App() {
  const path = window.location.pathname;

  const order = path.match(/^\/pedido\/([0-9a-fA-F-]{36})\/?$/);
  if (order) return <OrderPage id={order[1]} />;

  const ticket = path.match(/^\/t\/([A-Za-z0-9_-]{22})\/?$/);
  if (ticket) return <TicketPage code={ticket[1]} />;

  if (/^\/scan\/?$/.test(path)) return <ScanPage />;

  return <Landing />;
}
