// SPDX-License-Identifier: AGPL-3.0-or-later
// Standalone offline exporter. Not linked into the Expo application.
use postflop_solver::*;
use serde_json::{json, Value};
fn action(a: Action) -> Value {
    match a {
        Action::Fold => json!({"type":"fold"}),
        Action::Check => json!({"type":"check"}),
        Action::Call => json!({"type":"call"}),
        Action::Bet(to) | Action::Raise(to) | Action::AllIn(to) => json!({"type":"raise","to":to}),
        _ => panic!("Unexpected action"),
    }
}
fn export(game: &mut PostFlopGame, path: Vec<usize>, nodes: &mut Vec<Value>) {
    game.apply_history(&path);
    if game.is_terminal_node() {
        return;
    }
    assert!(!game.is_chance_node());
    let player = game.current_player();
    game.cache_normalized_weights();
    let cards = holes_to_strings(game.private_cards(player)).unwrap();
    let n = cards.len();
    let weights = game.normalized_weights(player).to_vec();
    let strategy = game.strategy();
    let ev = game.expected_values_detail(player);
    let actions = game.available_actions();
    assert_eq!(strategy.len(), n * actions.len());
    assert_eq!(ev.len(), strategy.len());
    let rows:Vec<Value>=(0..n).filter(|&h|weights[h]>0.).map(|h|{
 let probabilities:Vec<f32>=(0..actions.len()).map(|a|strategy[a*n+h]).collect();
 let values:Vec<f32>=(0..actions.len()).map(|a|ev[a*n+h]).collect();
 assert!((probabilities.iter().sum::<f32>()-1.).abs()<0.00001);
 assert!(values.iter().all(|v|v.is_finite()));
 json!({"cards":cards[h],"weight":weights[h],"rawWeight":game.weights(player)[h],"frequencies":probabilities,"ev":values})
 }).collect();
    nodes.push(json!({"path":path,"player":player,"actions":actions.iter().map(|&a|action(a)).collect::<Vec<_>>(),"combos":rows}));
    for a in 0..actions.len() {
        let mut next = path.clone();
        next.push(a);
        export(game, next, nodes);
    }
}
fn main() {
    let oop = "22+,A2s+,K5s+,Q8s+,J8s+,T8s+,98s,87s,76s,65s,ATo+,KJo+,QJo";
    let ip = "22+,A2s+,K2s+,Q8s+,J8s+,T8s+,97s+,86s+,76s,65s,54s,A5o+,KTo+,QTo+,JTo";
    let sizes = BetSizeOptions::try_from(("50%, 100%", "2.5x")).unwrap();
    let config = TreeConfig {
        initial_state: BoardState::River,
        starting_pot: 11,
        effective_stack: 195,
        rake_rate: 0.,
        rake_cap: 0.,
        river_bet_sizes: [sizes.clone(), sizes],
        add_allin_threshold: 0.,
        force_allin_threshold: 0.,
        merging_threshold: 0.,
        ..Default::default()
    };
    let cards = CardConfig {
        range: [oop.parse().unwrap(), ip.parse().unwrap()],
        flop: flop_from_str("Td7h2s").unwrap(),
        turn: card_from_str("Qs").unwrap(),
        river: card_from_str("9d").unwrap(),
    };
    let mut game = PostFlopGame::with_config(cards, ActionTree::new(config).unwrap()).unwrap();
    eprintln!("Memory {:?}", game.memory_usage());
    game.allocate_memory(false);
    let target = 0.00001;
    let mut iterations = 0;
    let mut exploitability = compute_exploitability(&game);
    for i in 0..100000 {
        if exploitability <= target {
            break;
        }
        solve_step(&game, i);
        iterations = i + 1;
        if iterations % 100 == 0 {
            exploitability = compute_exploitability(&game);
            eprintln!("iterations {iterations} exploitability {exploitability}");
        }
    }
    assert!(exploitability <= target, "Convergence target not achieved");
    finalize(&mut game);
    let mut nodes = Vec::new();
    export(&mut game, vec![], &mut nodes);
    let result = json!({"id":"academy-river-v1","source":{"engine":"b-inary/postflop-solver","revision":"9d1509fe5077d019825f833eed04b16d342dfda1","algorithm":"Discounted CFR","iterations":iterations,"exploitabilityChips":exploitability,"targetChips":target,"ranges":[oop,ip],"board":["Td","7h","2s","Qs","9d"],"startingPot":11,"effectiveStack":195,"rake":0,"betSizes":"50%, 100%","raiseSizes":"2.5x","addAllinThreshold":0,"forceAllinThreshold":0,"mergingThreshold":0},"nodes":nodes});
    std::fs::write(
        std::env::args()
            .nth(1)
            .unwrap_or("/tmp/academy-river-v1.json".into()),
        serde_json::to_string(&result).unwrap(),
    )
    .unwrap();
    eprintln!(
        "Exported {} nodes",
        result["nodes"].as_array().unwrap().len()
    );
}
