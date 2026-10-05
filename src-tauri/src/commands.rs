//! Tauri IPC commands for frontend communication
//! TODO: Implement commands via ipc crate when backend is ready

#[tauri::command]
pub fn calculate_position_size(
    entry: f64,
    stop: f64,
    risk_percent: f64,
    account_size: f64,
) -> Result<PositionSizeResult, String> {
    // TODO: Replace with real implementation from ipc crate
    // TODO: Stub does not apply contract_size_per_lot for the instrument (XAUUSD=100, BTCUSD=1)
    // This causes ~100x error on XAUUSD golden tests. Piloto will replace with domain real (rust_decimal).
    let risk_amount = account_size * (risk_percent / 100.0);
    let pip_risk = (entry - stop).abs();

    if pip_risk <= 0.0 {
        return Err("Invalid stop loss".to_string());
    }

    let lot_size = risk_amount / pip_risk;
    
    Ok(PositionSizeResult {
        lot_size,
        risk_amount,
    })
}

#[derive(serde::Serialize)]
pub struct PositionSizeResult {
    pub lot_size: f64,
    pub risk_amount: f64,
}
