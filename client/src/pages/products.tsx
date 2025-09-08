import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import ProductCard from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; 
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@shared/schema";

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
      
      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  // Sort products based on selected option
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

  const handleSearch = () => {
    // Trigger search by updating state (useQuery will automatically refetch)
  };

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#2c0f5b' }}>
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Products</h2>
            <p className="text-gray-600">Sorry, we couldn't load the products. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2c0f5b' }}>
      <Header />
      
      {/* Hero Section */}
      <section className="py-16" style={{ backgroundColor: '#2c0f5b' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6" style={{ color: 'white' }}>
              Quality <span style={{ color: 'white' }}>DIY Products</span>
            </h1>
            <p className="text-xl max-w-3xl mx-auto mb-8" style={{ color: '#b6a6f4' }}>
              Professional-grade tools and materials for every home project
            </p>
          </div>
          
          {/* Search Section */}
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search for tools, materials, supplies..."
                  className="pl-10 h-12 text-base bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} className="text-white px-8 py-3 h-12 text-base rounded-xl" style={{ backgroundColor: '#3c258e' }}>
                <Search className="mr-2 h-4 w-4" />
                Search Products
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Categories */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-6" style={{ color: '#b6a6f4' }}>Shop by Category</h3>
          <div className="flex flex-wrap gap-3">
            <Badge
              variant={selectedCategory === "" ? "default" : "secondary"}
              className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                selectedCategory === "" 
                  ? "text-white shadow-md" 
                  : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 dark:hover:border-green-700"
              }`}
              style={selectedCategory === "" ? { backgroundColor: '#3c258e' } : {}}
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
                    : "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 dark:hover:border-green-700"
                }`}
                style={
                  selectedCategory === category 
                    ? { backgroundColor: '#3c258e' }
                    : category === "Paint & Drywall / Spackling Supplies"
                    ? { color: 'white' }
                    : { color: 'rgb(55, 65, 81)' }
                }
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
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedCategory || "All Products"}
            </h2>
            <p className="text-gray-600">
              {isLoading ? 'Loading...' : `${sortedProducts.length} products found`}
            </p>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
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
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse">
                <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-3 w-3/4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your search or browse different categories.</p>
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
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="sm" className="bg-primary text-white">1</Button>
                <Button variant="outline" size="sm">2</Button>
                <Button variant="outline" size="sm">3</Button>
                <span className="px-3 py-2 text-gray-500">...</span>
                <Button variant="outline" size="sm">5</Button>
                <Button variant="outline" size="sm">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </nav>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
