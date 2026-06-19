#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Env, String, Address, Vec, symbol_short};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ActivityEntry {
    pub user: Address,
    pub action: String,
    pub timestamp: u64,
}

#[contract]
pub struct ActivityLogger;

#[contractimpl]
impl ActivityLogger {
    pub fn log_activity(env: Env, user: Address, action: String, timestamp: u64) {
        let entry = ActivityEntry {
            user: user.clone(),
            action,
            timestamp,
        };
        
        let key = symbol_short!("logs");
        let mut logs: Vec<ActivityEntry> = env.storage().instance().get(&key).unwrap_or(Vec::new(&env));
        logs.push_back(entry);
        env.storage().instance().set(&key, &logs);
    }
    
    pub fn get_logs(env: Env, user: Address) -> Vec<ActivityEntry> {
        let key = symbol_short!("logs");
        let logs: Vec<ActivityEntry> = env.storage().instance().get(&key).unwrap_or(Vec::new(&env));
        let mut filtered = Vec::new(&env);
        for entry in logs.iter() {
            if entry.user == user {
                filtered.push_back(entry.clone());
            }
        }
        filtered
    }
    
    pub fn get_all_logs(env: Env) -> Vec<ActivityEntry> {
        let key = symbol_short!("logs");
        env.storage().instance().get(&key).unwrap_or(Vec::new(&env))
    }
}
