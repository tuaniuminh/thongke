# Simulate firstDayDate calculation
import datetime

year = 2026
month = 8

firstDayDate = datetime.date(year, month, 1)
# getDay() in JS: Sunday=0, Monday=1, ..., Saturday=6
# In python: firstDayDate.weekday() has Monday=0, Tuesday=1, ..., Sunday=6
# So getDay() is (firstDayDate.weekday() + 1) % 7
py_wd = firstDayDate.weekday() # Saturday is 5
js_getDay = (py_wd + 1) % 7 # 6
print("firstDayDate.getDay():", js_getDay)

startDayOfWeek = (js_getDay + 6) % 7
print("startDayOfWeek:", startDayOfWeek) # 5

prevMonthTotalDays = 31 # July
totalDays = 31 # August
totalCells = 42

cells = []
# prev month days
for i in range(startDayOfWeek - 1, -1, -1):
    d = prevMonthTotalDays - i
    m = 12 if month == 1 else month - 1
    y = year - 1 if month == 1 else year
    cells.append({"day": d, "month": m, "year": y, "isCurrentMonth": False})

# current month days
for d in range(1, totalDays + 1):
    cells.append({"day": d, "month": month, "year": year, "isCurrentMonth": True})

# next month days
nextMonthDay = 1
while len(cells) < totalCells:
    m = 1 if month == 12 else month + 1
    y = year + 1 if month == 12 else year
    cells.append({"day": nextMonthDay, "month": m, "year": y, "isCurrentMonth": False})
    nextMonthDay += 1

print("Cells count:", len(cells))
for idx, cell in enumerate(cells):
    # Print the cell info and its column index (0-6)
    col_idx = idx % 7
    row_idx = idx // 7
    print(f"Index {idx:2d} (Row {row_idx}, Col {col_idx}): Day {cell['day']:2d}/{cell['month']:02d}/{cell['year']} - isCurrent: {cell['isCurrentMonth']}")
