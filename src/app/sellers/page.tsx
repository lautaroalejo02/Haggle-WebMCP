import { SellerStudio } from "@/components/seller-studio";
import { demoListings } from "@/lib/marketplace/demo-data";

export default function SellersPage() {
  return <SellerStudio listings={demoListings} />;
}
