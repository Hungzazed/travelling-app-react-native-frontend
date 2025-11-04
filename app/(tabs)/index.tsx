import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import { getTours, Tour } from "../../services/tourService";
import { getCurrentUser } from "../../services/authService";
import { getUnreadCount } from "../../services/notificationService";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 64) / 2;

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [filteredTours, setFilteredTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideScrollRef = useRef<ScrollView>(null);

  // Filter states
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("createdAt:desc");

  const categories = ["Tất cả", "Phổ biến", "Tiết kiệm", "Núi non"];
  const sortOptions = [
    { label: "Mới nhất", value: "createdAt:desc" },
    { label: "Cũ nhất", value: "createdAt:asc" },
    { label: "Giá thấp đến cao", value: "pricePerPerson:asc" },
    { label: "Giá cao đến thấp", value: "pricePerPerson:desc" },
    { label: "Tên A-Z", value: "name:asc" },
    { label: "Tên Z-A", value: "name:desc" },
  ];

  const bannerSlides = [
    {
      id: 1,
      image:
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      title: "Khám phá Sapa",
      subtitle: "Thiên nhiên núi rừng hùng vĩ",
      color: "#4CAF50",
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800",
      title: "Vịnh Hạ Long",
      subtitle: "Di sản thiên nhiên thế giới",
      color: "#2196F3",
    },
    {
      id: 3,
      image:
        "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800",
      title: "Đà Nẵng - Hội An",
      subtitle: "Thành phố đáng sống nhất",
      color: "#FF9800",
    },
    {
      id: 4,
      image:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
      title: "Biển Nha Trang",
      subtitle: "Thiên đường nghỉ dưỡng",
      color: "#00BCD4",
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  // Reload user data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const reloadUserData = async () => {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
          if (userData) {
            await loadUnreadNotifications();
          }
        } catch (error) {
          console.error("Error reloading user data:", error);
          setUser(null);
          setUnreadNotifications(0);
        }
      };

      reloadUserData();
    }, [])
  );

  useEffect(() => {
    loadDataByCategory();
  }, [selectedCategory, sortBy]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const nextSlide = (prev + 1) % bannerSlides.length;
        if (slideScrollRef.current) {
          slideScrollRef.current.scrollTo({
            x: nextSlide * width,
            animated: true,
          });
        }
        return nextSlide;
      });
    }, 2000); // Change slide every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const userData = await getCurrentUser();
      setUser(userData);

      // Load initial tours
      await loadDataByCategory();

      // Load unread notifications count chỉ khi đã đăng nhập
      if (userData) {
        await loadUnreadNotifications();
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnreadNotifications = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadNotifications(count);
    } catch (error) {
      console.error("Error loading unread notifications:", error);
      // Không hiển thị lỗi cho người dùng, chỉ log
      setUnreadNotifications(0);
    }
  };

  const loadDataByCategory = async () => {
    try {
      const params: any = {
        limit: 100,
        sortBy,
      };

      // Filter by category based on seed data
      if (selectedCategory === "Phổ biến") {
        // Popular: Get newest tours (Đà Nẵng, Nha Trang tours are popular)
        params.limit = 20;
        params.sortBy = "createdAt:desc";
      } else if (selectedCategory === "Tiết kiệm") {
        // Budget friendly: Tours <= 3,000,000 VND (Hạ Long 2.5tr, Vũng Tàu 1.8tr)
        // Không gửi maxPrice lên server, sẽ lọc ở client
        params.sortBy = "pricePerPerson:asc";
      } else if (selectedCategory === "Núi non") {
        // Mountains: Sapa (Lào Cai) - vùng núi
        params.destination = "sapa|lào cai|mộc châu|đà lạt|núi";
      }

      const toursData = await getTours(params);
      
      // Lọc theo giá ở phía client nếu là category "Tiết kiệm"
      let filteredResults = toursData.results;
      if (selectedCategory === "Tiết kiệm") {
        filteredResults = toursData.results.filter(
          (tour: any) => tour.pricePerPerson <= 3000000
        );
      }
      
      setTours(filteredResults);
      setFilteredTours(filteredResults);
    } catch (error) {
      console.error("Error loading tours by category:", error);
    }
  };

  const filterBySearch = () => {
    // When user searches, navigate to all-tours page with search query
    if (searchQuery.trim()) {
      router.push({
        pathname: "/all-tours" as any,
        params: {
          category: "search",
          query: searchQuery.trim(),
        },
      });
      // Clear search input after navigating
      setSearchQuery("");
    }
  };

  const applyFilters = async () => {
    try {
      setIsLoading(true);
      setShowFilterModal(false);

      const params: any = {
        limit: 100,
        sortBy,
      };

      // Không gửi minPrice và maxPrice lên server, sẽ lọc ở client
      const toursData = await getTours(params);
      
      // Lọc theo giá ở phía client
      let filteredResults = toursData.results;
      
      if (minPrice || maxPrice) {
        filteredResults = toursData.results.filter((tour: any) => {
          const price = tour.pricePerPerson;
          const min = minPrice ? parseInt(minPrice) : 0;
          const max = maxPrice ? parseInt(maxPrice) : Infinity;
          return price >= min && price <= max;
        });
      }
      
      setTours(filteredResults);
    } catch (error) {
      console.error("Error applying filters:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setSortBy("createdAt:desc");
    setSearchQuery("");
    setSelectedCategory("Tất cả");
    loadData();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    // loadUnreadNotifications đã được gọi trong loadData nếu user đã đăng nhập
    setRefreshing(false);
  };

  const displayTours = tours;
  const topPicks = displayTours.slice(0, 4);
  const groupTours = displayTours.slice(4, 8);
  const budgetTours = displayTours
    .filter((tour) => tour.pricePerPerson <= 3000000)
    .slice(0, 4);
  const luxuryTours = displayTours
    .filter((tour) => tour.pricePerPerson > 4000000)
    .slice(0, 4);
  const adventureTours = displayTours
    .filter(
      (tour) =>
        tour.destination.toLowerCase().includes("núi") ||
        tour.destination.toLowerCase().includes("sapa") ||
        tour.destination.toLowerCase().includes("đà lạt")
    )
    .slice(0, 4);
  const beachTours = displayTours
    .filter(
      (tour) =>
        tour.destination.toLowerCase().includes("nha trang") ||
        tour.destination.toLowerCase().includes("vũng tàu") ||
        tour.destination.toLowerCase().includes("đà nẵng") ||
        tour.destination.toLowerCase().includes("phú quốc")
    )
    .slice(0, 4);

  const handleSeeAllTopPicks = () => {
    router.push({
      pathname: "/all-tours" as any,
      params: { category: "top-picks" },
    });
  };

  const handleSeeAllGroupTours = () => {
    router.push({
      pathname: "/all-tours" as any,
      params: { category: "group-tours" },
    });
  };

  const handleSeeAllBudgetTours = () => {
    router.push({
      pathname: "/all-tours" as any,
      params: { category: "top-picks" },
    });
  };

  const handleSeeAllLuxuryTours = () => {
    router.push({
      pathname: "/all-tours" as any,
      params: { category: "top-picks" },
    });
  };

  const handleSeeAllBeachTours = () => {
    router.push({
      pathname: "/all-tours" as any,
      params: { category: "top-picks" },
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']} mode="padding">
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} mode="padding">
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarPlaceholder}>
              <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
                <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || "B"}
              </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.greetingSmall}>Xin chào,</Text>
              <Text style={styles.greetingName}>
                {user?.name?.split(" ")[0] || "Bạn"}
              </Text>
            </View>
          </View>
          {user && (
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push("/(tabs)/notifications" as any)}>
              <Ionicons name="notifications-outline" size={24} color="#1A1A1A" />
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <TouchableOpacity onPress={filterBySearch}>
              <Ionicons name="search-outline" size={20} color="#2196F3" />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm điểm đến..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={filterBySearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          {/* <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <MaterialIcons name="tune" size={24} color="#FFFFFF" />
          </TouchableOpacity> */}
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryPill,
                selectedCategory === category && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(category)}>
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive,
                ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Banner Slideshow */}
        <View style={styles.bannerContainer}>
          <ScrollView
            ref={slideScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const slideIndex = Math.round(
                event.nativeEvent.contentOffset.x / width
              );
              setCurrentSlide(slideIndex);
            }}
            scrollEventThrottle={200}
            decelerationRate="fast"
            snapToInterval={width}
            snapToAlignment="center">
            {bannerSlides.map((slide, index) => (
              <TouchableOpacity
                key={slide.id}
                style={styles.bannerSlide}
                activeOpacity={0.95}
                onPress={() => {
                  router.push({
                    pathname: "/all-tours" as any,
                    params: { category: "top-picks" },
                  });
                }}>
                <Image
                  source={{ uri: slide.image }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
                <View style={styles.bannerOverlay}>
                  <View style={styles.bannerContent}>
                    <View style={styles.bannerTextContainer}>
                      <Text style={styles.bannerTitle}>{slide.title}</Text>
                      <Text style={styles.bannerSubtitle}>
                        {slide.subtitle}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.bannerButton} onPress={() => {
                  router.push({
                    pathname: "/all-tours" as any,
                    params: { category: "top-picks" },
                  });
                }}>
                      <Text style={styles.bannerButtonText}>Xem ngay</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Slide Indicators */}
          <View style={styles.slideIndicators}>
            {bannerSlides.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  setCurrentSlide(index);
                  slideScrollRef.current?.scrollTo({
                    x: index * width,
                    animated: true,
                  });
                }}>
                <View
                  style={[
                    styles.indicator,
                    currentSlide === index && styles.indicatorActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Top Picks for You */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="star" size={20} color="#FFA500" />
              <Text style={styles.sectionTitle}>Gợi ý cho bạn</Text>
            </View>
            <TouchableOpacity onPress={handleSeeAllTopPicks}>
              <Text style={styles.seeAll}>Xem tất cả →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.picksContainer}>
            {topPicks.map((tour) => (
              <TouchableOpacity
                key={tour.id}
                style={styles.pickCard}
                onPress={() => {
                  const hasHotels =
                    Array.isArray(tour.hotels) && tour.hotels.length > 0;
                  if (hasHotels) {
                    router.push({
                      pathname: "/tour-hotel-booking" as any,
                      params: { tourId: tour.id },
                    });
                  } else {
                    router.push({
                      pathname: "/tour-detail" as any,
                      params: { id: tour.id },
                    });
                  }
                }}>
                <Image
                  source={{
                    uri:
                      tour.images?.[0] || "https://via.placeholder.com/300x200",
                  }}
                  style={styles.pickImage}
                />
                <View style={styles.pickOverlay}>
                  <View style={styles.pickRating}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.pickRatingText}>4.8</Text>
                  </View>
                </View>
                <View style={styles.pickInfo}>
                  <Text style={styles.pickName} numberOfLines={1}>
                    {tour.name}
                  </Text>
                  <View style={styles.pickLocationRow}>
                    <Ionicons name="location-outline" size={14} color="#999" />
                    <Text style={styles.pickLocation} numberOfLines={1}>
                      {tour.destination}
                    </Text>
                  </View>
                  <View style={styles.pickFooter}>
                    <View>
                      <Text style={styles.pickPrice}>
                        {tour.pricePerPerson.toLocaleString("vi-VN")}₫
                      </Text>
                    </View>
                    <View style={styles.pickBookButton}>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Group Tours */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="people" size={20} color="#2196F3" />
              <Text style={styles.sectionTitle}>Tour theo nhóm</Text>
            </View>
            <TouchableOpacity onPress={handleSeeAllGroupTours}>
              <Text style={styles.seeAll}>Xem tất cả →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.picksContainer}>
            {groupTours.map((tour) => (
              <TouchableOpacity
                key={tour.id}
                style={styles.pickCard}
                onPress={() => {
                  const hasHotels =
                    Array.isArray(tour.hotels) && tour.hotels.length > 0;
                  if (hasHotels) {
                    router.push({
                      pathname: "/tour-hotel-booking" as any,
                      params: { tourId: tour.id },
                    });
                  } else {
                    router.push({
                      pathname: "/tour-detail" as any,
                      params: { id: tour.id },
                    });
                  }
                }}>
                <Image
                  source={{
                    uri:
                      tour.images?.[0] || "https://via.placeholder.com/300x200",
                  }}
                  style={styles.pickImage}
                />
                <View style={styles.groupTourBadge}>
                  <Ionicons name="people" size={12} color="#FFFFFF" />
                  <Text style={styles.groupTourBadgeText}>Nhóm</Text>
                </View>
                <View style={styles.pickOverlay}>
                  <View style={styles.pickRating}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.pickRatingText}>4.5</Text>
                  </View>
                </View>
                <View style={styles.pickInfo}>
                  <Text style={styles.pickName} numberOfLines={1}>
                    {tour.name}
                  </Text>
                  <View style={styles.pickLocationRow}>
                    <Ionicons name="location-outline" size={14} color="#999" />
                    <Text style={styles.pickLocation} numberOfLines={1}>
                      {tour.destination}
                    </Text>
                  </View>
                  <View style={styles.pickFooter}>
                    <View>
                      <Text style={styles.pickPrice}>
                        {tour.pricePerPerson.toLocaleString("vi-VN")}₫
                      </Text>
                    </View>
                    <View style={styles.pickBookButton}>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Budget Tours - Tour Tiết Kiệm */}
        {budgetTours.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="wallet" size={20} color="#4CAF50" />
                <Text style={styles.sectionTitle}>Tour tiết kiệm</Text>
              </View>
              <TouchableOpacity onPress={handleSeeAllBudgetTours}>
                <Text style={styles.seeAll}>Xem tất cả →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.picksContainer}>
              {budgetTours.map((tour) => (
                <TouchableOpacity
                  key={tour.id}
                  style={styles.pickCard}
                  onPress={() => {
                    const hasHotels =
                      Array.isArray(tour.hotels) && tour.hotels.length > 0;
                    if (hasHotels) {
                      router.push({
                        pathname: "/tour-hotel-booking" as any,
                        params: { tourId: tour.id },
                      });
                    } else {
                      router.push({
                        pathname: "/tour-detail" as any,
                        params: { id: tour.id },
                      });
                    }
                  }}>
                  <Image
                    source={{
                      uri:
                        tour.images?.[0] ||
                        "https://via.placeholder.com/300x200",
                    }}
                    style={styles.pickImage}
                  />
                  <View style={styles.budgetBadge}>
                    <Ionicons name="pricetag" size={12} color="#FFFFFF" />
                    <Text style={styles.budgetBadgeText}>Tiết kiệm</Text>
                  </View>
                  <View style={styles.pickOverlay}>
                    <View style={styles.pickRating}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={styles.pickRatingText}>4.6</Text>
                    </View>
                  </View>
                  <View style={styles.pickInfo}>
                    <Text style={styles.pickName} numberOfLines={1}>
                      {tour.name}
                    </Text>
                    <View style={styles.pickLocationRow}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color="#999"
                      />
                      <Text style={styles.pickLocation} numberOfLines={1}>
                        {tour.destination}
                      </Text>
                    </View>
                    <View style={styles.pickFooter}>
                      <View>
                        <Text style={styles.pickPriceLabel}>Từ</Text>
                        <Text style={styles.pickPrice}>
                          {tour.pricePerPerson.toLocaleString("vi-VN")}₫
                        </Text>
                      </View>
                      <View style={styles.pickBookButton}>
                        <Ionicons
                          name="arrow-forward"
                          size={18}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Beach Tours - Tour Biển */}
        {beachTours.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="sunny" size={20} color="#00BCD4" />
                <Text style={styles.sectionTitle}>Tour biển đảo</Text>
              </View>
              <TouchableOpacity onPress={handleSeeAllBeachTours}>
                <Text style={styles.seeAll}>Xem tất cả →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.picksContainer}>
              {beachTours.map((tour) => (
                <TouchableOpacity
                  key={tour.id}
                  style={styles.pickCard}
                  onPress={() => {
                    const hasHotels =
                      Array.isArray(tour.hotels) && tour.hotels.length > 0;
                    if (hasHotels) {
                      router.push({
                        pathname: "/tour-hotel-booking" as any,
                        params: { tourId: tour.id },
                      });
                    } else {
                      router.push({
                        pathname: "/tour-detail" as any,
                        params: { id: tour.id },
                      });
                    }
                  }}>
                  <Image
                    source={{
                      uri:
                        tour.images?.[0] ||
                        "https://via.placeholder.com/300x200",
                    }}
                    style={styles.pickImage}
                  />
                  <View style={styles.beachBadge}>
                    <Ionicons name="water" size={12} color="#FFFFFF" />
                    <Text style={styles.beachBadgeText}>Biển</Text>
                  </View>
                  <View style={styles.pickOverlay}>
                    <View style={styles.pickRating}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={styles.pickRatingText}>4.7</Text>
                    </View>
                  </View>
                  <View style={styles.pickInfo}>
                    <Text style={styles.pickName} numberOfLines={1}>
                      {tour.name}
                    </Text>
                    <View style={styles.pickLocationRow}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color="#999"
                      />
                      <Text style={styles.pickLocation} numberOfLines={1}>
                        {tour.destination}
                      </Text>
                    </View>
                    <View style={styles.pickFooter}>
                      <View>
                        <Text style={styles.pickPriceLabel}>Từ</Text>
                        <Text style={styles.pickPrice}>
                          {tour.pricePerPerson.toLocaleString("vi-VN")}₫
                        </Text>
                      </View>
                      <View style={styles.pickBookButton}>
                        <Ionicons
                          name="arrow-forward"
                          size={18}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Luxury Tours - Tour Cao Cấp */}
        {luxuryTours.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="diamond" size={20} color="#9C27B0" />
                <Text style={styles.sectionTitle}>Tour cao cấp</Text>
              </View>
              <TouchableOpacity onPress={handleSeeAllLuxuryTours}>
                <Text style={styles.seeAll}>Xem tất cả →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.picksContainer}>
              {luxuryTours.map((tour) => (
                <TouchableOpacity
                  key={tour.id}
                  style={styles.pickCard}
                  onPress={() => {
                    const hasHotels =
                      Array.isArray(tour.hotels) && tour.hotels.length > 0;
                    if (hasHotels) {
                      router.push({
                        pathname: "/tour-hotel-booking" as any,
                        params: { tourId: tour.id },
                      });
                    } else {
                      router.push({
                        pathname: "/tour-detail" as any,
                        params: { id: tour.id },
                      });
                    }
                  }}>
                  <Image
                    source={{
                      uri:
                        tour.images?.[0] ||
                        "https://via.placeholder.com/300x200",
                    }}
                    style={styles.pickImage}
                  />
                  <View style={styles.luxuryBadge}>
                    <Ionicons name="trophy" size={12} color="#FFFFFF" />
                    <Text style={styles.luxuryBadgeText}>Cao cấp</Text>
                  </View>
                  <View style={styles.pickOverlay}>
                    <View style={styles.pickRating}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={styles.pickRatingText}>4.9</Text>
                    </View>
                  </View>
                  <View style={styles.pickInfo}>
                    <Text style={styles.pickName} numberOfLines={1}>
                      {tour.name}
                    </Text>
                    <View style={styles.pickLocationRow}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color="#999"
                      />
                      <Text style={styles.pickLocation} numberOfLines={1}>
                        {tour.destination}
                      </Text>
                    </View>
                    <View style={styles.pickFooter}>
                      <View>
                        <Text style={styles.pickPriceLabel}>Từ</Text>
                        <Text style={styles.pickPrice}>
                          {tour.pricePerPerson.toLocaleString("vi-VN")}₫
                        </Text>
                      </View>
                      <View style={styles.pickBookButton}>
                        <Ionicons
                          name="arrow-forward"
                          size={18}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bộ lọc tìm kiếm</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={28} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Sort Options */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Sắp xếp theo</Text>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      sortBy === option.value && styles.sortOptionActive,
                    ]}
                    onPress={() => setSortBy(option.value)}>
                    <Text
                      style={[
                        styles.sortOptionText,
                        sortBy === option.value && styles.sortOptionTextActive,
                      ]}>
                      {option.label}
                    </Text>
                    {sortBy === option.value && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#2196F3"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Price Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Khoảng giá (VNĐ)</Text>
                <View style={styles.priceInputContainer}>
                  <View style={styles.priceInputWrapper}>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={minPrice}
                      onChangeText={setMinPrice}
                    />
                  </View>
                  <Text style={styles.priceSeparator}>-</Text>
                  <View style={styles.priceInputWrapper}>
                    <Text style={styles.priceInputLabel}>Đến</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="Không giới hạn"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={maxPrice}
                      onChangeText={setMaxPrice}
                    />
                  </View>
                </View>
              </View>

              {/* Quick Price Filters */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Gợi ý giá</Text>
                <View style={styles.quickFiltersRow}>
                  <TouchableOpacity
                    style={styles.quickFilterPill}
                    onPress={() => {
                      setMinPrice("");
                      setMaxPrice("3000000");
                    }}>
                    <Text style={styles.quickFilterText}>Dưới 3tr</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickFilterPill}
                    onPress={() => {
                      setMinPrice("3000000");
                      setMaxPrice("7000000");
                    }}>
                    <Text style={styles.quickFilterText}>3tr - 7tr</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickFilterPill}
                    onPress={() => {
                      setMinPrice("7000000");
                      setMaxPrice("");
                    }}>
                    <Text style={styles.quickFilterText}>Trên 7tr</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Đặt lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Áp dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  headerText: {
    flex: 1,
  },
  greetingSmall: {
    fontSize: 13,
    color: "#999",
    fontWeight: "400",
  },
  greetingName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#FF4757",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  searchSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A1A",
    marginLeft: 8,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 0,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginRight: 8,
  },
  categoryPillActive: {
    borderBottomColor: "#2196F3",
  },
  categoryText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#999999",
  },
  categoryTextActive: {
    color: "#000000",
    fontWeight: "600",
  },
  // Banner Slideshow Styles
  bannerContainer: {
    marginHorizontal: 16,
    marginBottom: 28,
    height: 180,
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  bannerSlide: {
    width: width,
    height: 180,
    position: "relative",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  bannerContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  bannerTextContainer: {
    gap: 6,
  },
  bannerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 0.3,
  },
  bannerSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
    opacity: 0.95,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bannerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 6,
    alignSelf: "flex-start",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  bannerButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  slideIndicators: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  indicatorActive: {
    width: 20,
    backgroundColor: "#FFFFFF",
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2196F3",
  },
  picksContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  pickCard: {
    width: 260,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  pickImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#E0E0E0",
  },
  pickOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  pickRating: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  pickRatingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  pickInfo: {
    padding: 14,
  },
  pickName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  pickLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  pickLocation: {
    fontSize: 13,
    color: "#999",
    flex: 1,
  },
  pickFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickPriceLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 2,
  },
  pickPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2196F3",
  },
  pickBookButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
  },
  groupToursGrid: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  groupTourCard: {
    width: CARD_WIDTH,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  groupTourImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#E0E0E0",
  },
  groupTourBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(33, 150, 243, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  groupTourBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  budgetBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  budgetBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  beachBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 188, 212, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  beachBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  luxuryBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(156, 39, 176, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  luxuryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  groupTourInfo: {
    padding: 12,
  },
  groupTourName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
    lineHeight: 18,
    minHeight: 36,
  },
  groupTourLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 4,
  },
  groupTourLocation: {
    fontSize: 12,
    color: "#999",
    flex: 1,
  },
  groupTourFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupTourPriceLabel: {
    fontSize: 10,
    color: "#999",
    marginBottom: 2,
  },
  groupTourPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2196F3",
  },
  groupTourRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  groupTourRatingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginBottom: 8,
  },
  sortOptionActive: {
    backgroundColor: "#E3F2FD",
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  sortOptionText: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  sortOptionTextActive: {
    color: "#2196F3",
    fontWeight: "600",
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 13,
    color: "#999",
    marginBottom: 6,
  },
  priceInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  priceSeparator: {
    fontSize: 18,
    color: "#999",
    marginTop: 20,
  },
  quickFiltersRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickFilterPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  quickFilterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2196F3",
    alignItems: "center",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
avatarPlaceholder: {
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: '#007bff', // hoặc màu khác
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},

avatarText: {
  color: '#fff',
  fontSize: 20,
  fontWeight: 'bold',
},
});
