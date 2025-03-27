import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

interface Schedule {
  date: string;
  time: string;
  timestamp: number; 
}

const ESP32_IP = "192.168.1.3";

export default function App() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [newScheduleDate, setNewScheduleDate] = useState(new Date());
  const [showNewScheduleForm, setShowNewScheduleForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [feedingInProgress, setFeedingInProgress] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const handleConfirm = (event: any, selected?: Date) => {
    if (selected) {
      const now = new Date();
      now.setSeconds(0, 0); 

      if (showDatePicker) {
        const selectedDateOnly = new Date(selected);
        selectedDateOnly.setHours(0, 0, 0, 0);

        if (selectedDateOnly.getTime() < now.setHours(0, 0, 0, 0)) {
          alert("Selected date must be today or later.");
          resetFormDat();
          return;
        }

        setSelectedDate(
          selected.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        );
        setNewScheduleDate(selected);
      }

      if (showTimePicker) {
        if (!newScheduleDate) {
          alert("Please select a date first.");
          resetFormDat();
          return;
        }

        const selectedTime = new Date(selected);
        selectedTime.setSeconds(0, 0); 

        if (
          newScheduleDate.toDateString() === now.toDateString() &&
          selectedTime.getTime() < now.getTime()
        ) {
          alert("Selected time must be now or later.");
          resetFormDat();
          return;
        }

        const combinedDate = new Date(newScheduleDate);
        combinedDate.setHours(selectedTime.getHours());
        combinedDate.setMinutes(selectedTime.getMinutes());
        setNewScheduleDate(combinedDate);

        setSelectedTime(
          selectedTime.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        );
      }
    }

    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const resetFormDat = () => {
    resetForm(); 
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const resetForm = () => {
    setSelectedDate(null);
    setSelectedTime(null);
    setNewScheduleDate(new Date());
    setShowNewScheduleForm(false);
  };

  const addSchedule = async () => {
    const formattedDate = newScheduleDate.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const formattedTime = newScheduleDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const timestamp = newScheduleDate.getTime();

    const newSchedule = { date: formattedDate, time: formattedTime, timestamp };
    setSchedules(prevSchedules => {
      const updatedSchedules = [...prevSchedules, newSchedule];

      return updatedSchedules.sort((a, b) => a.timestamp - b.timestamp);
    });

    const hour = newScheduleDate.getHours();
    const minute = newScheduleDate.getMinutes();
    await fetch(`http://${ESP32_IP}/set-schedule?hour=${hour}&minute=${minute}`);

    resetForm();
  };

  const feedNow = async () => {
    setFeedingInProgress(true); 
    await fetch(`http://${ESP32_IP}/open`);
    setFeedingInProgress(false); 
    Alert.alert("Feeding Complete", "The pet has been fed successfully.");
  };

  const checkScheduledFeedings = () => {
    const now = new Date();
    now.setSeconds(0, 0); 

    const matchingSchedules = schedules.filter(schedule => {
      const scheduledTime = new Date(schedule.timestamp);
      scheduledTime.setSeconds(0, 0);
      return scheduledTime.getTime() === now.getTime();
    });

    matchingSchedules.forEach(async (schedule) => {
      await feedNow();
      setSchedules(prevSchedules => prevSchedules.filter(s => s.timestamp !== schedule.timestamp));
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      checkScheduledFeedings();
    }, 60000); 

    return () => clearInterval(interval);
  }, [schedules]);

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SMART PET FEEDER</Text>

      <View style={styles.card}>
        <Text style={styles.subtitle}>On-going Schedule</Text>
        {schedules.length === 0 ? (
          <Text style={styles.noData}>No data</Text>
        ) : (
          schedules.map((schedule, index) => (
            <View key={index} style={styles.scheduleItem}>
              <Text>
                {schedule.date} {schedule.time}
              </Text>
              <TouchableOpacity onPress={() => removeSchedule(index)}>
                <Text style={styles.trashIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowNewScheduleForm(true)}
        >
          <Text style={styles.buttonIcon}>➕</Text>
          <Text style={styles.buttonText}>ADD NEW SCHEDULE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, feedingInProgress && styles.activeButton]}
          onPress={async () => {
            await feedNow(); 
          }}
        >
          <Text style={styles.buttonIcon}>🍽️</Text>
          <Text style={styles.buttonText}>OPEN FEEDER</Text>
        </TouchableOpacity>
      </View>

      {showNewScheduleForm && (
        <View style={styles.newScheduleForm}>
          <Text style={styles.subtitle}>NEW SCHEDULE</Text>

          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.pickerText}>
              {selectedDate ? selectedDate : "Select Date"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pickerButton,
              !selectedDate && { backgroundColor: "#ccc" }, 
            ]}
            onPress={() => {
              if (!selectedDate) {
                alert("Please select a date first.");
                return;
              }
              setShowTimePicker(true);
            }}
          >
            <Text style={styles.pickerText}>
              {selectedTime ? selectedTime : "Select Time"}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={newScheduleDate}
              mode="date"
              display="spinner"
              onChange={handleConfirm}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={newScheduleDate}
              mode="time"
              display="spinner"
              onChange={handleConfirm}
            />
          )}

          <View style={styles.formButtonContainer}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={addSchedule}
            >
              <Text style={{ color: "#FFF", fontWeight: "bold" }}>CONFIRM</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={resetForm}>
              <Text style={{ color: "#FFF", fontWeight: "bold" }}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E0F7FA",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  card: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  noData: {
    textAlign: "center",
    color: "#9E9E9E",
  },
  scheduleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 8,
  },
  trashIcon: {
    color: "#F44336",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
  },
  button: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activeButton: {
    borderColor: "green",
    borderWidth: 2,
  },
  buttonIcon: {
    fontSize: 24,
    color: "#03A9F4",
    marginBottom: 4,
  },
  buttonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  newScheduleForm: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
    width: "90%",
  },
  pickerButton: {
    backgroundColor: "transparent",
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    width: "100%",
    alignItems: "center",
    borderColor: "#000",
    borderWidth: 1,
  },
  pickerText: {
    fontSize: 16,
    color: "#333",
  },
  formButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  confirmButton: {
    backgroundColor: "#03A9F4",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 24,
    alignItems: "center",
    marginRight: 8,
    marginTop: 8,
  },
  closeButton: {
    backgroundColor: "#F44336",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 8,
  },
});