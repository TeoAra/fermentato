-- Performance indexes for Fermenta.to
-- These indexes dramatically speed up all common queries (JOIN, filter, count operations)

CREATE INDEX IF NOT EXISTS idx_beers_brewery_id ON beers(brewery_id);
CREATE INDEX IF NOT EXISTS idx_beers_style ON beers(style);
CREATE INDEX IF NOT EXISTS idx_beers_name_lower ON beers(lower(name) text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_tap_list_pub_id ON tap_list(pub_id);
CREATE INDEX IF NOT EXISTS idx_tap_list_beer_id ON tap_list(beer_id);
CREATE INDEX IF NOT EXISTS idx_bottle_list_pub_id ON bottle_list(pub_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_item ON favorites(item_type, item_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tastings_beer_id ON user_beer_tastings(beer_id);
CREATE INDEX IF NOT EXISTS idx_tastings_user_id ON user_beer_tastings(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON user_activities(user_id);

CREATE INDEX IF NOT EXISTS idx_menu_categories_pub_id ON menu_categories(pub_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_pub_events_pub_id ON pub_events(pub_id);
CREATE INDEX IF NOT EXISTS idx_brewery_events_brewery_id ON brewery_events(brewery_id);

CREATE INDEX IF NOT EXISTS idx_breweries_name_lower ON breweries(lower(name) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_breweries_country ON breweries(country);
CREATE INDEX IF NOT EXISTS idx_pubs_owner_id ON pubs(owner_id);
