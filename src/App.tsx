import NavBar from "./components/NavBar";
import HeroSection from "./components/HeroSection";
import NextGameBar from "./components/NextGameBar";
import ConceptSection from "./components/ConceptSection";
import RosterSection from "./components/RosterSection";
import StaffSection from "./components/StaffSection";
import CalendarSection from "./components/CalendarSection";
import TicketsSection from "./components/TicketsSection";
import TryoutsSection from "./components/TryoutsSection";
import SponsorsSection from "./components/SponsorsSection";
import GallerySection from "./components/GallerySection";
import FooterSection from "./components/FooterSection";

export default function App() {
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
      <TryoutsSection />
      <SponsorsSection />
      <GallerySection />
      <FooterSection />
    </div>
  );
}
