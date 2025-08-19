const DEFAULT_OPTIONS = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
}

const formatDate = (date, options = DEFAULT_OPTIONS) => date.toLocaleDateString('en-US', options);


export default formatDate