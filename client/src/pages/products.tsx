import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; 
import { Search, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import type { Product } from "@shared/schema";
import logoHomeowner from "@assets/my-homebase-logo-tm-howner-white-final_1776538414393.png";
import "./home.css";

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sortBy, setSortBy] = useState('best-match');

  const categories = [
    "Hardware", 
    "Paint & Drywall / Spackling Supplies",
    "Lighting",
    "Plumbing",
    "Miscellaneous"
  ];

  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: ['/api/products', { search: searchQuery, category: selectedCategory }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategory) params.set('category', selectedCategory);
      
      if (searchQuery || selectedCategory) {
        try {
          await fetch('/api/analytics/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              searchTerm: searchQuery || selectedCategory || 'product search',
              serviceType: selectedCategory,
              searchContext: 'marketplace'
            })
          });
        } catch (error) {
          console.error('Failed to track search:', error);
        }
      }
      
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const sortedProducts = products ? [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return parseFloat(a.price) - parseFloat(b.price);
      case 'price-high':
        return parseFloat(b.price) - parseFloat(a.price);
      case 'highest-rated':
        return parseFloat(b.rating) - parseFloat(a.rating);
      case 'most-reviews':
        return b.reviewCount - a.reviewCount;
      default:
        return 0;
    }
  }) : [];

  const topRatedCount = products?.filter(p => parseFloat(p.rating) >= 4).length ?? 0;

  const handleSearch = () => {};

  // Back-to-top button
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen" style={{ background: '#ffffff' }}>
        <div className="dash-header">
          <div className="dash-header-top">
            <img src={logoHomeowner} alt="MyHomeBase™" className="dash-logo" />
          </div>
          <span className="dash-eyebrow">Homeowner</span>
          <div className="dash-title">Shop Products</div>
          <div className="dash-subtitle">Professional-grade tools and materials for every home project</div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h2 className="text-xl font-bold mb-2" style={{ color: '#2c0f5b' }}>Error Loading Products</h2>
          <p style={{ color: '#4a3670' }}>Sorry, we couldn't load the products. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#ffffff' }}>

      {/* ── PAGE HEADER ─────────────────────────── */}
      <div className="dash-header">
        <div className="dash-header-top">
          <img src={logoHomeowner} alt="MyHomeBase™" className="dash-logo" />
        </div>
        <span className="dash-eyebrow">Homeowner</span>
        <div className="dash-title">Shop Products</div>
        <div className="dash-subtitle">Professional-grade tools and materials for every home project</div>
        <div className="dash-chips">
          <div className="dash-chip">
            <div className={`dash-chip-num${sortedProducts.length > 0 ? ' good' : ''}`}>{sortedProducts.length}</div>
            <div className="dash-chip-label">Results</div>
          </div>
          <div className="dash-chip">
            <div className="dash-chip-num">{categories.length}</div>
            <div className="dash-chip-label">Categories</div>
          </div>
          <div className="dash-chip">
            <div className={`dash-chip-num${topRatedCount > 0 ? ' good' : ''}`}>{topRatedCount}</div>
            <div className="dash-chip-label">Top Rated</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8">

        {/* Search Card */}
        <div className="rounded-2xl p-4 sm:p-5 mb-6 sm:mb-8" style={{ background: '#fff', border: '1px solid #ede9f8', boxShadow: '0 2px 12px rgba(44,15,91,0.06)' }}>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4" style={{ color: '#b6a6f4' }} />
              <Input
                type="text"
                placeholder="Search for tools, materials, supplies..."
                className="pl-10 h-11 sm:h-12 text-sm sm:text-base"
                style={{ borderColor: '#b6a6f4', color: '#2c0f5b' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} className="w-full md:w-auto text-white px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base rounded-xl hover:opacity-90" style={{ backgroundColor: '#2c0f5b' }}>
              <Search className="mr-2 h-4 w-4" />
              Search Products
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <h3 className="text-base sm:text-lg font-bold mb-4" style={{ color: '#2c0f5b' }}>Shop by Category</h3>
          <div className="flex flex-wrap gap-3">
            <Badge
              variant={selectedCategory === "" ? "default" : "secondary"}
              className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                selectedCategory === "" 
                  ? "text-white shadow-md" 
                  : "text-gray-700 border border-gray-200 hover:border-purple-300 hover:bg-purple-50"
              }`}
              style={selectedCategory === "" ? { backgroundColor: '#2c0f5b' } : { backgroundColor: '#faf8ff' }}
              onClick={() => setSelectedCategory("")}
            >
              All Categories
            </Badge>
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "secondary"}
                className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                  selectedCategory === category 
                    ? "text-white shadow-md" 
                    : "text-gray-700 border border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                }`}
                style={selectedCategory === category ? { backgroundColor: '#2c0f5b' } : { backgroundColor: '#faf8ff' }}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold" style={{ color: '#2c0f5b' }}>
              {selectedCategory || "All Products"}
            </h2>
            <p className="text-sm" style={{ color: '#4a3670' }}>
              {isLoading ? 'Loading…' : `${sortedProducts.length} products found`}
            </p>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44 sm:w-48" style={{ backgroundColor: '#ffffff', color: '#2c0f5b', borderColor: '#b6a6f4' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="best-match">Best Match</SelectItem>
              <SelectItem value="highest-rated">Highest Rated</SelectItem>
              <SelectItem value="most-reviews">Most Reviews</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse" style={{ border: '1px solid #ede9f8' }}>
                <div className="w-full h-48 rounded-xl mb-4" style={{ backgroundColor: '#f0ebfa' }}></div>
                <div className="h-4 rounded mb-2" style={{ backgroundColor: '#ede9f8' }}></div>
                <div className="h-4 rounded mb-3 w-3/4" style={{ backgroundColor: '#ede9f8' }}></div>
                <div className="flex justify-between items-center">
                  <div className="h-6 rounded w-20" style={{ backgroundColor: '#ede9f8' }}></div>
                  <div className="h-8 rounded w-24" style={{ backgroundColor: '#ede9f8' }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{ background: '#fff', border: '1px solid #ede9f8' }}>
            <Search className="w-12 h-12 mx-auto mb-3" style={{ color: '#b6a6f4' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#2c0f5b' }}>No products found</h3>
            <p style={{ color: '#4a3670' }}>Try adjusting your search or browse different categories.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex justify-center">
              <nav className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled className="hover:bg-purple-50">
                  <ChevronLeft className="h-4 w-4" style={{ color: '#b6a6f4' }} />
                </Button>
                <Button size="sm" style={{ backgroundColor: '#2c0f5b', color: '#fff' }}>1</Button>
                <Button variant="outline" size="sm" className="hover:bg-purple-50" style={{ color: '#b6a6f4' }}>2</Button>
                <Button variant="outline" size="sm" className="hover:bg-purple-50" style={{ color: '#b6a6f4' }}>3</Button>
                <span className="px-3 py-2 text-gray-400">...</span>
                <Button variant="outline" size="sm" className="hover:bg-purple-50" style={{ color: '#b6a6f4' }}>5</Button>
                <Button variant="outline" size="sm" className="hover:bg-purple-50">
                  <ChevronRight className="h-4 w-4" style={{ color: '#b6a6f4' }} />
                </Button>
              </nav>
            </div>
          </>
        )}
      </div>

      {showBackToTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top" data-testid="button-back-to-top" style={{ position: 'fixed', bottom: '88px', right: '16px', zIndex: 50, width: 44, height: 44, borderRadius: '50%', backgroundColor: '#2c0f5b', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(44,15,91,0.45)' }}>
          <ChevronUp style={{ width: 20, height: 20 }} />
        </button>
      )}
    </div>
  );
}
