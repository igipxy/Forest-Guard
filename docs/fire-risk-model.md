# Weather-Based Fire Risk Prediction Model

## Weighted Heuristic Formula (`heuristic-v1.2.0`)
The rule-based engine implements `IFireRiskModel` and computes a normalized `0–100` score from five environmental parameters:
1. **Ambient Temperature (25%)**: Linearly normalized between `20°C` (0 pts) and `42°C+` (100 pts).
2. **Relative Humidity Inverse (25%)**: Linearly normalized between `85%` (0 pts) and `15%` (100 pts).
3. **Wind Speed (20%)**: Linearly normalized between `0 km/h` (0 pts) and `45+ km/h` (100 pts).
4. **Dry Spell Duration (20%)**: Linearly normalized between `0 days` (0 pts) and `14+ dry days` (100 pts), damped by `0.25x` when active rainfall exceeds `2.0 mm`.
5. **UV Index (10%)**: Linearly normalized between `UV 0` (0 pts) and `UV 11+` (100 pts).

## Classifications
- `0–20`: `VERY_LOW`
- `21–40`: `LOW`
- `41–60`: `MODERATE`
- `61–80`: `HIGH`
- `81–100`: `EXTREME`

## Operational Disclaimer
This score indicates weather-driven environmental susceptibility and is never presented as confirmed optical or thermal fire detection.