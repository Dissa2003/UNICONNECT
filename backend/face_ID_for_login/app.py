import streamlit as st
from streamlit_autorefresh import st_autorefresh

from face_auth.ui import load_today_attendance, today_date_string

# Auto-refresh every 2 seconds
count = st_autorefresh(interval=2000, limit=None, key="auto-refresh")

date = today_date_string()

st.title("📋 Face Recognition Attendance")
st.write(f"📅 Date: {date}")
st.write(f"🔄 Auto-refresh count: {count}")

try:
    df = load_today_attendance()
    st.success("✅ Attendance file loaded")
    st.dataframe(df.style.highlight_max(axis=0))
except FileNotFoundError:
    st.warning("⚠️ Attendance file not found yet. Please mark attendance using the camera system.")
