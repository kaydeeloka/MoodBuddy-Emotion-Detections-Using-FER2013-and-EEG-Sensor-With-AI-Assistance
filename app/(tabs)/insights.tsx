import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import EmojiSVG, { emojiToMood, moodToEmoji } from '../../components/EmojiSVG';
import { API_ENDPOINTS, getApiUrl } from '../../config/local';
import { UserStorage } from '../../constants/userStorage'; // ADDED: Import UserStorage

const radius = 100;
const strokeWidth = 40;
const centerX = radius + strokeWidth;
const centerY = radius + strokeWidth;

const colors = {
  happy: '#4CAF50',
  sad: '#2196F3',
  neutral: '#9C27B0',
  angry: '#F44336',
  disgust: '#FF9800',
  fear: '#795548',
  surprise: '#E91E63',
};

const moodToY = {
  happy: 1,
  sad: 2,
  neutral: 3,
  surprise: 4,
  fear: 5,
  disgust: 6,
  angry: 7,
};

  // Calculate chart dimensions for line chart
  const chartWidth = 320;
  const chartHeight = 300;
  const chartPadding = { top: 20, right: 20, bottom: 40, left: 60 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;

type MoodName = keyof typeof colors;

interface DailyMoodData {
  date: dayjs.Dayjs;
  mood: MoodName;
  emoji: string;
}

interface LineChartPoint {
  x: number;
  y: number;
  mood: MoodName;
  emoji: string;
  date: dayjs.Dayjs;
  dayOfMonth: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(startAngle: number, endAngle: number): string {
  const start = polarToCartesian(centerX, centerY, radius, startAngle);
  const end = polarToCartesian(centerX, centerY, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

// Fetch mood data
const fetchMoodData = async (startDate: string, endDate: string) => {
  try {
    const currentUser = await UserStorage.getUser();
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const username = currentUser.username || currentUser.email || 'unknown';
    
    const response = await fetch(
      `${getApiUrl('/moods/filter')}?user_id=${username}&start_date=${startDate}&end_date=${endDate}`, 
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const moods = await response.json();
    
    // Transform the response to match your expected format
    const transformedMoods: Record<string, any> = {};
    moods.forEach((mood: any) => {
      transformedMoods[mood.mood_date] = {
        id: mood.id.toString(),
        date: mood.mood_date,
        mood: mood.mood,
        note: mood.note
      };
    });
    
    return transformedMoods;
  } catch (error) {
    console.error('Error fetching mood data:', error);
    throw error;
  }
};


const InsightsScreen = () => {
  // ADDED: User state management
  const [user, setUser] = useState<{username: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [moodCounts, setMoodCounts] = useState<Record<MoodName, number>>({} as Record<MoodName, number>);
  const [total, setTotal] = useState(0);
  const [dailyData, setDailyData] = useState<DailyMoodData[]>([]);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const availableYears = Array.from({ length: 21 }, (_, i) => dayjs().year() - 5 + i);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [tempMonth, setTempMonth] = useState(selectedMonth.month());
  const [tempYear, setTempYear] = useState(selectedMonth.year());

  // ADDED: Load user on component mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await UserStorage.getUser();
        if (userData) {
          setUser({
            username: userData.username || userData.email || 'unknown'
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
      }
    };
    
    loadUser();
  }, []);
  
  const fetchMonthlyMoodData = useCallback(async () => {
    // ADDED: Check if user is available before fetching
    if (!user) {
      console.log('No user available, skipping mood data fetch');
      return;
    }

    const start = selectedMonth.startOf('month').format('YYYY-MM-DD');
    const end = selectedMonth.endOf('month').format('YYYY-MM-DD');

    setIsLoading(true);
    try {
      const data = await fetchMoodData(start, end);
      const counts: Record<MoodName, number> = {} as Record<MoodName, number>;
      const dailyMoodData: DailyMoodData[] = [];

      // Work directly with the object format (Record<string, MoodEntry>)
      Object.values(data).forEach((entry: any) => {
        // FIXED: Convert mood name from backend to emoji, then to mood name
        const moodEmoji = moodToEmoji[entry.mood] || '😐'; // Convert mood name to emoji
        const moodName = emojiToMood[moodEmoji] as MoodName; // Convert emoji to mood name

        if (moodName) {
          // Monthly counts
          counts[moodName] = (counts[moodName] || 0) + 1;

          // Daily data for line chart
          dailyMoodData.push({
            date: dayjs(entry.date),
            mood: moodName,
            emoji: moodEmoji,
          });
        }
      });

      // Sort daily data by date
      dailyMoodData.sort((a, b) => a.date.diff(b.date));

      setMoodCounts(counts);
      setTotal(Object.values(counts).reduce((a, b) => a + b, 0));
      setDailyData(dailyMoodData);
    } catch (err) {
      console.error('Failed to fetch mood data:', err);
      // Set empty state on error
      setMoodCounts({} as Record<MoodName, number>);
      setTotal(0);
      setDailyData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, user]); // ADDED: user as dependency

  // This will run every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchMonthlyMoodData();
      }
    }, [fetchMonthlyMoodData])
  );

  // Keep the original useEffect for when selectedMonth changes
  useEffect(() => {
    if (user) {
      fetchMonthlyMoodData();
    }
  }, [selectedMonth, fetchMonthlyMoodData]);

  const orderedMoods: MoodName[] = ['happy', 'sad', 'neutral', 'surprise', 'fear', 'disgust', 'angry'];
  const moodAngles = orderedMoods.map((mood) => ({
    emoji: moodToEmoji[mood],
    mood,
    count: moodCounts[mood] || 0,
    angle: total > 0 ? ((moodCounts[mood] || 0) / total) * 180 : 0,
  }));

  let startAngle = -180;
  // Create line chart data
  const createLineChartData = (): LineChartPoint[] => {
    if (dailyData.length === 0) return [];

    const startDate = selectedMonth.startOf('month');
    const endDate = selectedMonth.endOf('month');
    const totalDays = endDate.diff(startDate, 'day') + 1;

    return dailyData.map((entry, index) => {
      const dayOfMonth = entry.date.diff(startDate, 'day');
      const x = chartPadding.left + (dayOfMonth / (totalDays - 1)) * plotWidth;
      const y = chartPadding.top + ((moodToY[entry.mood] - 1) / 6) * plotHeight;

      return {
        x,
        y,
        mood: entry.mood,
        emoji: entry.emoji,
        date: entry.date,
        dayOfMonth: dayOfMonth + 1,
      };
    });
  };

  const lineData = createLineChartData();

  // Check if the selected month is the current month or later
  const isCurrentMonth = selectedMonth.isSame(dayjs(), 'month');
  const isFutureMonth = selectedMonth.isAfter(dayjs(), 'month');
  const isNextDisabled = isCurrentMonth || isFutureMonth;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F6DADD"
        translucent={false}
      />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Navigation */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setSelectedMonth(selectedMonth.subtract(1, 'month'))}
          >
            <Text style={styles.navButtonText}>← Previous</Text>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <TouchableOpacity
              onPress={() => {
                setTempMonth(selectedMonth.month());
                setTempYear(selectedMonth.year());
                setShowMonthYearPicker(true);
              }}
            >
              <Text style={styles.headerTitle}>
                {selectedMonth.format('MMMM YYYY')} ⌵
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.navButton, isNextDisabled && styles.navButtonDisabled]}
            onPress={isNextDisabled ? undefined : () => setSelectedMonth(selectedMonth.add(1, 'month'))}
            disabled={isNextDisabled}
          >
            <Text style={[styles.navButtonText, isNextDisabled && styles.navButtonTextDisabled]}>Next →</Text>
          </TouchableOpacity>
        </View>

        {/* Monthly Mood Count Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Mood Count</Text>
            <Text style={styles.cardSubtitle}>Your mood breakdown for this month</Text>
          </View>

          {/* ADDED: Loading state */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading mood data...</Text>
            </View>
          ) : total > 0 ? (
            <>
              <View style={styles.chartContainer}>
                <Svg width={2 * (radius + strokeWidth)} height={radius + strokeWidth + 20}>
                  <G>
                    {moodAngles.map(({ mood, angle }) => {
                      if (angle === 0) return null;
                      const endAngle = startAngle + angle;
                      const path = describeArc(startAngle, endAngle);
                      const color = colors[mood] || '#ccc';
                      startAngle = endAngle;

                      return (
                        <Path
                          key={mood}
                          d={path}
                          stroke={color}
                          strokeWidth={strokeWidth}
                          fill="none"
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </G>
                </Svg>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalText}>{total}</Text>
                  <Text style={styles.totalLabel}>Total Entries</Text>
                </View>
              </View>

              <View style={styles.emojiGrid}>
                {moodAngles.map(({ mood, emoji, count }) => (
                  count > 0 ? (
                    <View key={mood} style={styles.emojiCard}>
                      <View style={[styles.badge, { backgroundColor: colors[mood] || '#ccc' }]}>
                        <Text style={styles.badgeText}>{count}</Text>
                      </View>
                      <EmojiSVG type={emoji} size={28} />
                      <Text style={styles.moodLabel}>{mood}</Text>
                    </View>
                  ) : null
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>No mood data for this month</Text>
              <Text style={styles.emptySubtext}>Start tracking your moods to see statistics here</Text>
            </View>
          )}
        </View>

          {/* Daily Mood Line Chart Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Mood Trend</Text>
            <Text style={styles.cardSubtitle}>Your mood journey throughout the month</Text>
          </View>

            {dailyData.length > 0 ? (
              <View style={styles.lineChartContainer}>
                <Svg width={chartWidth} height={chartHeight}>
                  {/* Y-axis */}
                  
                    <SvgText
                    //style your graph title
                    x={chartWidth - 282}
                    y={chartHeight - 5}
                    fontSize="12"
                    fill="#333"
                    textAnchor="middle"
                    fontWeight="bold"
                    >
                    Mood
                    </SvgText>
                  <Line
                    x1={chartPadding.left}
                    y1={chartPadding.top}
                    x2={chartPadding.left}
                    y2={chartHeight - chartPadding.bottom}
                    stroke="#E0E0E0"
                    strokeWidth="1"
                  />

                  {/* X-axis*/}
                  <SvgText
                  //style your graph title
                  x={chartWidth - 140} 
                  y={chartHeight - 5}
                  fontSize="12"
                  fill="#333"
                  textAnchor="middle"
                  fontWeight="bold"
                  >
                  Day of Month
                  </SvgText>
                  <Line
                    x1={chartPadding.left}
                    y1={chartHeight - chartPadding.bottom}
                    x2={chartWidth - chartPadding.right}
                    y2={chartHeight - chartPadding.bottom}
                    stroke="#E0E0E0"
                    strokeWidth="1"
                  />

                  {/* Y-axis labels (circles and lines only) */}
                  {Object.entries(moodToY).map(([mood, position]) => {
                    const y = chartPadding.top + ((position - 1) / 6) * plotHeight;
                    const moodKey = mood as MoodName;
                    return (
                      <G key={mood}>
                        <Circle
                          cx={chartPadding.left - 15}
                          cy={y}
                          r="4"
                          fill={colors[moodKey]}
                        />
                        <Line
                          x1={chartPadding.left - 5}
                          y1={y}
                          x2={chartPadding.left}
                          y2={y}
                          stroke="#E0E0E0"
                          strokeWidth="1"
                        />
                      </G>
                    );
                  })}

                  {/* X-axis labels (dates) */}
                  {[1, 5, 10, 15, 20,25, selectedMonth.daysInMonth()].map((day) => {
                    const x = chartPadding.left + ((day - 1) / (selectedMonth.daysInMonth() - 1)) * plotWidth;
                    return (
                      <G key={day}>
                        <SvgText
                          x={x}
                          y={chartHeight - chartPadding.bottom + 15}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#666"
                        >
                          {day}
                        </SvgText>
                        <Line
                          x1={x}
                          y1={chartHeight - chartPadding.bottom}
                          x2={x}
                          y2={chartHeight - chartPadding.bottom + 5}
                          stroke="#E0E0E0"
                          strokeWidth="1"
                        />
                      </G>
                    );
                  })}

                  {/* Connecting lines between all points */}
                  {lineData.length > 1 && (
                    lineData.slice(1).map((point, index) => {
                      const prevPoint = lineData[index];
                      return (
                        <Line
                          key={`connection-${index}`}
                          x1={prevPoint.x}
                          y1={prevPoint.y}
                          x2={point.x}
                          y2={point.y}
                          stroke={colors[point.mood]}
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      );
                    })
                  )}

                  {/* Data points */}
                  {lineData.map((point, index) => (
                    <Circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill={colors[point.mood]}
                      stroke="#fff"
                      strokeWidth="2"
                    />
                  ))}
                </Svg>

                {/* Y-axis Emoji Overlay */}
                <View style={{
                  position: 'absolute',
                  width: chartWidth,
                  height: chartHeight,
                  marginTop: 18,
                  zIndex: 10,
                  pointerEvents: 'none',
                }}>
                  {Object.entries(moodToY).map(([mood, position]) => {
                    const y = chartPadding.top + ((position - 1) / 6) * plotHeight;
                    return (
                      <View
                        key={`emoji-label-${mood}`}
                        style={{
                          position: 'absolute',
                          top: y - 8, // Center with the circle
                          left: chartPadding.left - 45, // Position to the left of the chart
                        }}
                      >
                        <EmojiSVG type={moodToEmoji[mood as MoodName]} size={20} />
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📈</Text>
                <Text style={styles.emptyText}>No daily data available</Text>
                <Text style={styles.emptySubtext}>Track more moods to see daily trends</Text>
              </View>
            )}
        </View>

        </ScrollView>
        {showMonthYearPicker && (
  
  <View style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  }}>
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 20,
      width: 300,
      alignItems: 'center',
    }}>
      <Text style={styles.modalTitle}>Select Month & Year</Text>

      <View style={{ flexDirection: 'row', width: '100%' }}>
        <ScrollView style={{ flex: 1, height: 150 }} snapToInterval={30}>
          {Array.from({ length: 12 }, (_, i) => (
            <TouchableOpacity
              key={i}
              style={{ padding: 10, alignItems: 'center' }}
              onPress={() => setTempMonth(i)}
            >
              <Text style={{ color: tempMonth === i ? '#BA5F5F' : '#333', fontWeight: 'bold' }}>
                {dayjs().month(i).format('MMMM')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView style={{ flex: 1, height: 150 }} snapToInterval={30}>
          {availableYears.map((year) => (
            <TouchableOpacity
              key={year}
              style={{ padding: 10, alignItems: 'center' }}
              onPress={() => setTempYear(year)}
            >
              <Text style={{ color: tempYear === year ? '#BA5F5F' : '#333', fontWeight: 'bold' }}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setShowMonthYearPicker(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => {
            const newDate = dayjs().year(tempYear).month(tempMonth);
            setSelectedMonth(newDate);
            setShowMonthYearPicker(false);
          }}
        >
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}

      </SafeAreaView>
  );
};

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: '#F6DADD',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  container: {
    padding: 16,
    backgroundColor: '#F6DADD',
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  navButton: {
    backgroundColor: '#BA5F5F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#888888',
  },
  chartContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  totalContainer: {
    position: 'absolute',
    alignItems: 'center',
    top: 90,
  },
  totalText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#212121',
  },
  totalLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 10,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
  },
  emojiCard: {
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    minWidth: 60,
  },
  badge: {
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  moodLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#424242',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  lineChartContainer: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 20
    ,
  },
  yearPicker: {
    flexDirection: 'row',
    marginTop: 4,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  yearOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#eee',
    borderRadius: 6,
    marginHorizontal: 4,
  },
  yearOptionSelected: {
    backgroundColor: '#BA5F5F',
  },
  yearOptionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  pickerWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '50%',
  },
  picker: {
    flex: 1,
    height: 180,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 1,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    marginRight: 5,
    padding: 12,
    backgroundColor: '#ccc',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    marginLeft: 5,
    padding: 12,
    backgroundColor: '#BA5F5F',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  loadingContainer: {
  alignItems: 'center',
  paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 16,
  },

});

export default InsightsScreen;
