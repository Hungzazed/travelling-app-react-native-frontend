import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getTours, Tour } from '../services/tourService';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function AllToursScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const category = params.category as string;
  const searchQueryParam = params.query as string;
  
  const [tours, setTours] = useState<Tour[]>([]);
  const [filteredTours, setFilteredTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchQueryParam || '');

  const getCategoryTitle = () => {
    if (category === 'search') {
      return 'Search Results';
    }
    switch (category) {
      case 'top-picks':
        return 'Top Picks';
      case 'group-tours':
        return 'Group Tours';
      default:
        return 'All Tours';
    }
  };

  const getExploreText = () => {
    if (category === 'search') {
      return `Search results for "${searchQueryParam}"`;
    }
    switch (category) {
      case 'top-picks':
        return 'Explore Top Picks';
      case 'group-tours':
        return 'Explore Group Tours';
      default:
        return 'Explore All Tours';
    }
  };

  useEffect(() => {
    loadTours();
  }, [category]);

  useEffect(() => {
    filterTours();
  }, [tours, searchQuery]);

  const loadTours = async () => {
    try {
      setIsLoading(true);
      const toursData = await getTours({ 
        limit: 100, 
        sortBy: 'createdAt:desc'
      });
      
      let filteredTours = toursData.results;

      // Filter by category
      if (category === 'top-picks') {
        filteredTours = toursData.results.slice(0, 20);
      } else if (category === 'group-tours') {
        filteredTours = toursData.results;
      }

      setTours(filteredTours);
    } catch (error) {
      console.error('Error loading tours:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTours = () => {
    let result = [...tours];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        tour =>
          tour.name.toLowerCase().includes(query) ||
          tour.destination.toLowerCase().includes(query)
      );
    }

    setFilteredTours(result);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTours();
    setRefreshing(false);
  };

  const handleTourPress = (tour: Tour) => {
    const hasHotels = Array.isArray(tour.hotels) && tour.hotels.length > 0;
    if (hasHotels) {
      router.push({ 
        pathname: '/tour-hotel-booking' as any, 
        params: { tourId: tour.id } 
      });
    } else {
      router.push({ 
        pathname: '/tour-detail' as any, 
        params: { id: tour.id } 
      });
    }
  };

  const displayTours = filteredTours.length > 0 ? filteredTours : tours;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B61FF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getCategoryTitle()}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Explore Title */}
      <View style={styles.exploreTitleContainer}>
        <Text style={styles.exploreTitle}>
          Explore <Text style={styles.exploreTitleBold}>{getCategoryTitle()}</Text>
        </Text>
      </View>

      {/* Search and Filter Row */}
      <View style={styles.searchFilterRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Here"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <MaterialIcons name="tune" size={24} color="#7B61FF" />
        </TouchableOpacity>
      </View>

      {/* Category Badge */}
      {category === 'group-tours' && (
        <View style={styles.categoryBadgeContainer}>
          <Ionicons name="square" size={16} color="#FF6B6B" />
          <Text style={styles.categoryBadgeText}>Group Tours</Text>
        </View>
      )}

      {/* Tours List */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.toursContainer}>
          {displayTours.map((tour, index) => (
            <TouchableOpacity
              key={tour.id}
              style={styles.tourCard}
              onPress={() => handleTourPress(tour)}
              activeOpacity={0.7}
            >
              {/* Tour Image */}
              <Image
                source={{ uri: tour.images?.[0] || 'https://via.placeholder.com/100x100' }}
                style={styles.tourImage}
              />

              {/* Tour Info */}
              <View style={styles.tourInfo}>
                <Text style={styles.tourName} numberOfLines={1}>
                  {tour.name}
                </Text>
                <View style={styles.tourMeta}>
                  <Ionicons name="people-outline" size={14} color="#999" />
                  <Text style={styles.tourMetaText}>From</Text>
                  <Text style={styles.tourDuration}>{tour.duration}</Text>
                </View>
                
                {/* User Avatars */}
                <View style={styles.avatarsContainer}>
                  <View style={styles.avatarsRow}>
                    <View style={[styles.avatar, styles.avatar1]} />
                    <View style={[styles.avatar, styles.avatar2]} />
                    <View style={[styles.avatar, styles.avatar3]} />
                    <View style={[styles.avatar, styles.avatar4]} />
                  </View>
                </View>
              </View>

              {/* Rating */}
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#FFA500" />
                <Text style={styles.ratingText}>4.5</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Empty State */}
        {displayTours.length === 0 && !isLoading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#E0E0E0" />
            <Text style={styles.emptyText}>No tours found</Text>
            <Text style={styles.emptySubText}>
              {searchQuery ? 'Try different keywords' : 'Please try again later'}
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  exploreTitleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  exploreTitle: {
    fontSize: 24,
    color: '#333333',
  },
  exploreTitleBold: {
    fontWeight: '700',
    color: '#000000',
  },
  searchFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  categoryBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  toursContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  tourCard: {
    width: (width - 56) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  tourImage: {
    width: '100%',
    height: (width - 56) / 2,
    backgroundColor: '#F0F0F0',
  },
  tourInfo: {
    padding: 12,
  },
  tourName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 6,
  },
  tourMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  tourMetaText: {
    fontSize: 12,
    color: '#999999',
  },
  tourDuration: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  avatarsContainer: {
    marginTop: 4,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginLeft: -8,
  },
  avatar1: {
    backgroundColor: '#FF6B6B',
    marginLeft: 0,
  },
  avatar2: {
    backgroundColor: '#4ECDC4',
  },
  avatar3: {
    backgroundColor: '#FFE66D',
  },
  avatar4: {
    backgroundColor: '#95E1D3',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
