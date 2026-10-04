export type Kind = "offer" | "want";
export type Category = "trip" | "airport" | "home" | "errand" | "event";
export type RequestStatus = "pending" | "approved" | "declined";
export type LatLng = [number, number];

export interface Me { id: string; email: string }

export interface Profile {
  id: string;
  display_name: string;
  college: string | null;
  /** Root .edu domain, set by the database from the student's email. */
  school?: string | null;
  email_alerts?: boolean;
}

export interface ProfileStats { avg_stars: number | null; rating_count: number; rides_driven: number; rides_taken: number }

export interface RideInput {
  kind: Kind;
  category: Category;
  origin: string;
  destination: string;
  origin_lat: number | null;
  origin_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  pickup_note: string | null;
  route: LatLng[] | null;
  depart_at: string;
  seats: number;
  miles: number | null;
  /** Per seat, set by the driver. Null means "ask the driver"; 0 means free. */
  price: number | null;
  note: string | null;
}

export interface Ride extends RideInput {
  id: string;
  owner_id: string;
  owner: Pick<Profile, "display_name" | "college" | "school"> | null;
  taken: number;
  created_at?: string;
}

export interface SeatRequest {
  id: string;
  ride_id: string;
  rider_id: string;
  status: RequestStatus;
  message: string | null;
  rider?: Pick<Profile, "display_name" | "college" | "school"> | null;
}

export interface Participant { id: string; display_name: string; college: string | null; school: string | null; is_owner: boolean }

/** Only rides leaving within `miles` of `center`. */
export interface Near { center: LatLng; miles: number }

export interface Message { id: string; ride_id: string; sender_id: string; body: string; created_at: string }

export interface Review {
  id: string;
  ride_id: string;
  rater_id: string;
  ratee_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  rater?: Pick<Profile, "display_name"> | null;
}

export type TripRole = "driver" | "rider" | "poster";
export interface Trip { ride: Ride; role: TripRole }

export interface Api {
  mode: "demo" | "live";
  getSession(): Promise<Me | null>;
  onAuth(cb: (me: Me | null) => void): () => void;
  sendMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;

  getProfile(id: string): Promise<Profile | null>;
  saveProfile(p: Omit<Profile, "id" | "school">): Promise<void>;
  getProfileStats(id: string): Promise<ProfileStats>;
  listReviews(id: string): Promise<Review[]>;

  listRides(near?: Near): Promise<Ride[]>;
  getRide(id: string): Promise<Ride | null>;
  createRide(input: RideInput, contact: string): Promise<string>;
  deleteRide(id: string): Promise<void>;
  myTrips(): Promise<Trip[]>;

  myRequests(): Promise<Record<string, SeatRequest>>;
  requestsFor(rideId: string): Promise<SeatRequest[]>;
  requestSeat(rideId: string, message: string): Promise<void>;
  cancelRequest(id: string): Promise<void>;
  setRequestStatus(id: string, status: RequestStatus): Promise<void>;
  getContact(rideId: string): Promise<string | null>;

  participants(rideId: string): Promise<Participant[]>;
  listMessages(rideId: string): Promise<Message[]>;
  sendMessage(rideId: string, body: string): Promise<void>;

  ratingsGiven(rideId: string): Promise<Review[]>;
  rate(rideId: string, rateeId: string, stars: number, comment: string): Promise<void>;

  /** Calls cb whenever rides or requests change (board-level). */
  subscribeBoard(cb: () => void): () => void;
  /** Calls cb whenever this ride's messages or requests change. */
  subscribeRide(rideId: string, cb: () => void): () => void;
}
